import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioLines, BookOpen, CircleHelp, CloudOff, Download, Headphones, Radio, Settings2, ShieldCheck, Sparkles } from 'lucide-react'
import Library from './components/Library.jsx'
import AudioEditor from './components/AudioEditor.jsx'
import Stage from './components/Stage.jsx'
import { db, DEFAULT_PROJECT_ID, ensureProject, makeId } from './lib/database.js'
import { useAudioEngine } from './hooks/useAudioEngine.js'
import { isSupabaseConfigured } from './lib/supabase.js'

const blankEntry = () => ({ id: '', projectId: DEFAULT_PROJECT_ID, position: 0, name: '', nickname: '', groupName: '', notes: '', emoji: '🎓', color: '#e8bd6620', audioBlob: null, audioName: '', audioDuration: 0, spotifyUrl: '', spotifyTrackId: '', spotifyTitle: '', spotifyArtist: '', startSec: 0, endSec: 0, fadeIn: 0.5, fadeOut: 1, volume: 85 })

export default function App() {
  const [tab, setTab] = useState('library')
  const [entries, setEntries] = useState([])
  const [editing, setEditing] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState('Minha formatura')
  const autoRef = useRef(autoAdvance)
  const entriesRef = useRef(entries)
  const indexRef = useRef(currentIndex)
  const toastTimer = useRef(null)
  useEffect(() => { autoRef.current = autoAdvance }, [autoAdvance])
  useEffect(() => { entriesRef.current = entries }, [entries])
  useEffect(() => { indexRef.current = currentIndex }, [currentIndex])

  const showToast = useCallback(message => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3500)
  }, [])

  const handleEnded = useCallback(() => {
    if (autoRef.current) {
      const nextIndex = indexRef.current + 1
      if (nextIndex < entriesRef.current.length) {
        indexRef.current = nextIndex
        setCurrentIndex(nextIndex)
        setTimeout(() => {
          const next = entriesRef.current[nextIndex]
          if (next?.audioBlob) audioRef.current?.play(next).catch(err => showToast(err.message || 'Erro ao tocar áudio'))
          else showToast(next?.spotifyTrackId ? 'A próxima entrada usa Spotify. Toque no player do Spotify para iniciar.' : 'A próxima entrada não tem áudio. Reprodução automática pausada.')
        }, 80)
      } else showToast('Fim da lista de entradas.')
    }
  }, [showToast])
  const audio = useAudioEngine({ onEnded: handleEnded })
  const audioRef = useRef(audio)
  useEffect(() => { audioRef.current = audio }, [audio])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const project = await ensureProject()
        const list = await db.entries.where('projectId').equals(DEFAULT_PROJECT_ID).sortBy('position')
        if (!cancelled) { setProjectName(project.name); setEntries(list) }
      } catch { showToast('Não foi possível abrir o armazenamento local.') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true; clearTimeout(toastTimer.current) }
  }, [showToast])

  async function saveEntry(form) {
    try {
      const id = form.id || makeId()
      const position = form.id ? (entries.find(x => x.id === form.id)?.position ?? entries.length) : entries.length
      const entry = { ...form, id, projectId: DEFAULT_PROJECT_ID, position, updatedAt: new Date().toISOString() }
      await db.entries.put(entry)
      const list = await db.entries.where('projectId').equals(DEFAULT_PROJECT_ID).sortBy('position')
      setEntries(list)
      setCurrentIndex(Math.max(0, list.findIndex(x => x.id === (entries[currentIndex]?.id || id))))
      setEditing(null)
      showToast('Entrada salva automaticamente neste dispositivo.')
    } catch { showToast('Erro ao salvar. Verifique o espaço disponível no dispositivo.') }
  }

  async function deleteEntry(entry) {
    if (!window.confirm(`Excluir a entrada "${entry.name}"?`)) return
    if (entries[currentIndex]?.id === entry.id) audio.stop()
    await db.entries.delete(entry.id)
    const list = await db.entries.where('projectId').equals(DEFAULT_PROJECT_ID).sortBy('position')
    setEntries(list)
    setCurrentIndex(Math.min(currentIndex, Math.max(0, list.length - 1)))
    showToast('Entrada excluída.')
  }

  async function moveEntry(index, direction) {
    const target = index + direction
    if (target < 0 || target >= entries.length) return
    const list = [...entries]
    ;[list[index], list[target]] = [list[target], list[index]]
    await db.transaction('rw', db.entries, async () => {
      await Promise.all(list.map((entry, i) => db.entries.put({ ...entry, position: i })))
    })
    setEntries(list.map((entry, i) => ({ ...entry, position: i })))
  }

  async function playEntry(entry, preview = false) {
    try { await audio.play(entry, { preview }) }
    catch (error) { showToast(error?.message || 'Não foi possível reproduzir esse áudio.') }
  }
  const current = entries[currentIndex]
  function nextEntry() {
    audio.stop()
    if (!entries.length) return
    const next = currentIndex + 1
    if (next >= entries.length) { showToast('Você chegou ao fim da lista.'); return }
    setCurrentIndex(next)
    if (entries[next].audioBlob) setTimeout(() => playEntry(entries[next]), 80)
    else if (entries[next].spotifyTrackId) showToast('Use o player do Spotify exibido no palco para iniciar a faixa.')
    else showToast('Próxima entrada selecionada, mas ainda sem áudio.')
  }
  function startCurrent() {
    if (!current) return
    if (audio.playing) { audio.stop(); return }
    if (!current.audioBlob) { showToast(current.spotifyTrackId ? 'Toque em ▶ no player do Spotify para reproduzir esta faixa.' : 'Adicione um áudio a esta entrada na Biblioteca.'); return }
    playEntry(current)
  }

  async function exportProject() {
    try {
      const payload = { format: 'entrada-show-v1', project: { name: projectName }, entries: await Promise.all(entries.map(async e => ({ ...e, audioBlob: e.audioBlob ? { type: e.audioBlob.type, name: e.audioName, data: await blobToBase64(e.audioBlob) } : null }))) }
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'entrada-show-backup.json'; a.click(); URL.revokeObjectURL(url)
      showToast('Backup exportado.')
    } catch { showToast('Não foi possível criar o backup.') }
  }
  function blobToBase64(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob) }) }

  async function importProject(file) {
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      if (payload.format !== 'entrada-show-v1' || !Array.isArray(payload.entries)) throw new Error('Formato inválido')
      const imported = payload.entries.map((e, i) => ({ ...e, id: makeId(), projectId: DEFAULT_PROJECT_ID, position: i, audioBlob: e.audioBlob?.data ? base64ToBlob(e.audioBlob.data, e.audioBlob.type) : null }))
      await db.transaction('rw', db.entries, async () => { await db.entries.where('projectId').equals(DEFAULT_PROJECT_ID).delete(); await db.entries.bulkPut(imported) })
      setEntries(imported); setCurrentIndex(0); showToast('Backup importado com sucesso.')
    } catch { showToast('Arquivo de backup inválido ou corrompido.') }
  }
  function base64ToBlob(base64, type) { const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0)); return new Blob([bytes], { type: type || 'audio/mpeg' }) }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-300"><AudioLines className="mr-3 animate-pulse text-gold"/> Carregando Entrada Show…</div>
  if (tab === 'stage') return <Stage entries={entries} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} audio={audio} autoAdvance={autoAdvance} setAutoAdvance={setAutoAdvance} onStart={startCurrent} onNext={nextEntry} onStop={() => audio.stop()} onRepeat={() => current?.audioBlob && playEntry(current)} onExit={() => { audio.stop(); setTab('library') }}/>

  return <div className="min-h-screen pb-12"><header className="sticky top-0 z-30 border-b border-white/[.07] bg-ink/85 backdrop-blur-xl"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold text-ink"><AudioLines size={24}/></div><div><h1 className="text-lg font-black tracking-tight">Entrada <span className="text-gold">Show</span></h1><p className="text-[10px] uppercase tracking-[.2em] text-slate-500">Controle de palco</p></div></div><div className="flex items-center gap-2"><label title="Importar backup" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5"><Download size={17}/><input className="hidden" type="file" accept="application/json,.json" onChange={e => importProject(e.target.files?.[0])}/></label><button title="Exportar backup" onClick={exportProject} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5"><ShieldCheck size={18}/></button><button onClick={() => { if (!entries.length) { showToast('Adicione entradas à biblioteca antes de abrir o palco.'); return } setCurrentIndex(Math.min(currentIndex, entries.length-1)); setTab('stage') }} className="flex min-h-11 items-center gap-2 rounded-xl bg-gold px-3 text-sm font-bold text-ink sm:px-5"><Radio size={17}/> <span className="hidden sm:inline">Modo palco</span><span className="sm:hidden">Palco</span></button></div></div></header>
    <main className="mx-auto max-w-6xl px-4 pt-7 sm:px-6 sm:pt-10"><section className="mb-8 overflow-hidden rounded-3xl border border-gold/15 bg-gradient-to-br from-[#24283a] via-[#151c2a] to-[#10141d] p-5 sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="max-w-xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-gold"><Sparkles size={13}/> Pronto para o grande momento</div><h2 className="text-3xl font-black leading-tight sm:text-4xl">Cada entrada no tempo <span className="text-gold">certo.</span></h2><p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">Organize os áudios, recorte os trechos e controle a cerimônia com poucos toques — mesmo sem internet.</p></div><div className="grid grid-cols-2 gap-3 sm:min-w-52"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-3xl font-black text-gold">{entries.length}</p><p className="mt-1 text-xs text-slate-400">Entradas salvas</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-3xl font-black">OFF</p><p className="mt-1 text-xs text-slate-400">Modo local ativo</p></div></div></div></section>
      <div className="mb-6 flex items-center gap-2 border-b border-white/10 pb-3"><button onClick={() => setTab('library')} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"><BookOpen size={17} className="text-gold"/> Biblioteca</button><div className="ml-auto flex items-center gap-2 text-xs text-slate-500"><CloudOff size={15}/> Salvamento local automático</div></div>
      <Library entries={entries} onCreate={() => setEditing(blankEntry())} onEdit={entry => setEditing({ ...entry })} onDelete={deleteEntry} onPreview={entry => playEntry(entry, true)} onMove={moveEntry}/>
      <section className="mt-8 grid gap-3 sm:grid-cols-3"><div className="glass flex items-start gap-3 rounded-2xl p-4"><Headphones size={20} className="mt-1 shrink-0 text-gold"/><div><h3 className="text-sm font-bold">Áudio local</h3><p className="mt-1 text-xs leading-5 text-slate-400">Os arquivos ficam salvos neste dispositivo. Faça backup antes de trocar de aparelho.</p></div></div><div className="glass flex items-start gap-3 rounded-2xl p-4"><Settings2 size={20} className="mt-1 shrink-0 text-gold"/><div><h3 className="text-sm font-bold">Controle ao vivo</h3><p className="mt-1 text-xs leading-5 text-slate-400">Use o modo palco para PLAY, PRÓXIMO, repetir e parada de emergência.</p></div></div><div className="glass flex items-start gap-3 rounded-2xl p-4"><CircleHelp size={20} className="mt-1 shrink-0 text-gold"/><div><h3 className="text-sm font-bold">Sincronização Supabase</h3><p className="mt-1 text-xs leading-5 text-slate-400">{isSupabaseConfigured ? 'Credenciais detectadas. O fluxo de sincronização ainda precisa ser conectado.' : 'Opcional: configure as credenciais no .env para preparar a integração.'}</p></div></div></section>
    </main>{editing && <AudioEditor entry={editing} onSave={saveEntry} onClose={() => setEditing(null)} onPreview={entry => playEntry(entry, true)}/>} {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-[#202938] px-4 py-3 text-center text-sm font-semibold shadow-2xl">{toast}</div>}
  </div>
}
