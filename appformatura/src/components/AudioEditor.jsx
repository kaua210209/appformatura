
import { useState } from 'react'
import {
  Music2,
  Upload,
  Play,
  Save,
  X,
  Scissors,
  Link2,
  ExternalLink,
  Search,
} from 'lucide-react'

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-[#0b1019] px-3 py-3 text-sm text-white placeholder:text-slate-500'

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400'

const timeText = (value) => {
  const n = Math.max(0, Number(value) || 0)
  const minutes = Math.floor(n / 60)
  const seconds = Math.floor(n % 60)
  const tenths = Math.floor((n % 1) * 10)

  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`
}

function parseSpotifyTrackId(value) {
  const input = (value || '').trim()
  const uriMatch = input.match(/^spotify:track:([a-zA-Z0-9]+)$/)

  if (uriMatch) return uriMatch[1]

  try {
    const url = new URL(input)

    if (
      !['open.spotify.com', 'www.open.spotify.com'].includes(
        url.hostname,
      )
    ) {
      return ''
    }

    return url.pathname.match(/^\/track\/([a-zA-Z0-9]+)/)?.[1] || ''
  } catch {
    return ''
  }
}

export default function AudioEditor({
  entry,
  onSave,
  onClose,
  onPreview,
}) {
  const [form, setForm] = useState(() => ({ ...entry }))
  const [audioName, setAudioName] = useState(entry.audioName || '')
  const [audioDuration, setAudioDuration] = useState(
    Number(entry.audioDuration) || 0,
  )
  const [spotifyInput, setSpotifyInput] = useState(
    entry.spotifyUrl || '',
  )
  const [error, setError] = useState('')
  const [loadingAudio, setLoadingAudio] = useState(false)

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateSpotify(value) {
    setSpotifyInput(value)

    const trackId = parseSpotifyTrackId(value)

    setForm((prev) => ({
      ...prev,
      spotifyUrl: value.trim(),
      spotifyTrackId: trackId,
    }))

    setError(
      value.trim() && !trackId
        ? 'Cole um link válido de uma faixa do Spotify.'
        : '',
    )
  }

  function pickAudio(file) {
    if (!file) return

    if (
      !file.type.startsWith('audio/') &&
      !/\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(file.name)
    ) {
      setError('Escolha um arquivo de áudio, como MP3 ou WAV.')
      return
    }

    const url = URL.createObjectURL(file)
    const audio = new Audio()

    audio.preload = 'metadata'
    setLoadingAudio(true)
    setError('Carregando duração do áudio...')

    audio.onloadedmetadata = () => {
      const duration = audio.duration

      URL.revokeObjectURL(url)
      setLoadingAudio(false)

      if (!Number.isFinite(duration) || duration <= 0) {
        setError(
          'Não foi possível detectar a duração desse áudio. Tente outro arquivo.',
        )
        return
      }

      setAudioDuration(duration)
      setAudioName(file.name)

      setForm((prev) => ({
        ...prev,
        audioBlob: file,
        audioName: file.name,
        audioDuration: duration,
        startSec: 0,
        endSec: duration,
      }))

      setError('')
    }

    audio.onerror = () => {
      URL.revokeObjectURL(url)
      setLoadingAudio(false)
      setError(
        'Não foi possível carregar esse áudio. Tente outro arquivo.',
      )
    }

    audio.src = url
    audio.load()
  }

  function changeStart(value) {
    if (!audioDuration) return

    const maxStart = Math.max(0, audioDuration - 0.1)
    const start = Math.max(
      0,
      Math.min(maxStart, Number(value) || 0),
    )

    setForm((prev) => {
      const currentEnd = Number(prev.endSec) || audioDuration

      return {
        ...prev,
        startSec: start,
        endSec: Math.min(
          audioDuration,
          Math.max(start + 0.1, currentEnd),
        ),
      }
    })
  }

  function changeEnd(value) {
    if (!audioDuration) return

    const start = Number(form.startSec) || 0
    const minEnd = Math.min(audioDuration, start + 0.1)
    const end = Math.max(
      minEnd,
      Math.min(audioDuration, Number(value) || audioDuration),
    )

    setForm((prev) => ({
      ...prev,
      endSec: end,
    }))
  }

  function save() {
    if (!form.name?.trim()) {
      setError('Informe o nome da entrada.')
      return
    }

    const start = Math.max(0, Number(form.startSec) || 0)
    const end = Number(form.endSec) || audioDuration

    if (
      form.audioBlob &&
      (
        !audioDuration ||
        start >= audioDuration ||
        end <= start ||
        end > audioDuration
      )
    ) {
      setError('Escolha um início e um fim válidos para o áudio.')
      return
    }

    const spotifyTrackId = parseSpotifyTrackId(spotifyInput)

    if (spotifyInput.trim() && !spotifyTrackId) {
      setError('O link do Spotify não parece ser válido.')
      return
    }

    onSave({
      ...form,
      name: form.name.trim(),
      startSec: form.audioBlob ? start : 0,
      endSec: form.audioBlob
        ? Math.min(audioDuration, end)
        : 0,
      audioDuration,
      audioName,
      spotifyUrl: spotifyTrackId
        ? `https://open.spotify.com/track/${spotifyTrackId}`
        : '',
      spotifyTrackId,
    })
  }

  const startSec = Math.max(0, Number(form.startSec) || 0)
  const endSec = Number(form.endSec) || audioDuration
  const hasAudio = Boolean(form.audioBlob)
  const maxStart = Math.max(0, audioDuration - 0.1)
  const minEnd = Math.min(audioDuration, startSec + 0.1)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section className="glass max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-gold">
              Biblioteca
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {entry.id ? 'Editar entrada' : 'Nova entrada'}
            </h2>
          </div>

          <button
            type="button"
            className="rounded-xl bg-white/5 p-3"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Nome da entrada *</span>
            <input
              className={fieldClass}
              value={form.name || ''}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Ex.: Entrada da turma"
            />
          </label>

          <label>
            <span className={labelClass}>Nome / apelido</span>
            <input
              className={fieldClass}
              value={form.nickname || ''}
              onChange={(e) => update('nickname', e.target.value)}
              placeholder="Ex.: Ana Clara"
            />
          </label>

          <label>
            <span className={labelClass}>Grupo / turma</span>
            <input
              className={fieldClass}
              value={form.groupName || ''}
              onChange={(e) => update('groupName', e.target.value)}
              placeholder="Ex.: Administração"
            />
          </label>

          <label>
            <span className={labelClass}>Emoji de identificação</span>
            <select
              className={fieldClass}
              value={form.emoji || '🎓'}
              onChange={(e) => update('emoji', e.target.value)}
            >
              {[
                '🎓',
                '✨',
                '🎉',
                '⭐',
                '🎵',
                '🏆',
                '💛',
                '🔥',
                '🌟',
                '🎤',
              ].map((emoji) => (
                <option key={emoji} value={emoji}>
                  {emoji}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className={labelClass}>Observações</span>
          <textarea
            className={fieldClass}
            rows="2"
            value={form.notes || ''}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Informações para a equipe no palco"
          />
        </label>

        {/* Seleção do áudio */}
        <div className="mt-5 rounded-2xl border border-dashed border-gold/40 bg-gold/[.04] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-gold/10 p-3 text-gold">
              <Music2 />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold">Áudio da entrada</p>
              <p className="truncate text-xs text-slate-400">
                {audioName || 'Nenhum arquivo selecionado'}
              </p>
            </div>

            <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-gold px-4 text-sm font-bold text-ink">
              <Upload size={17} />
              Escolher arquivo
              <input
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac"
                className="hidden"
                onChange={(e) => {
                  pickAudio(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
          </div>

          {loadingAudio && (
            <p className="mt-3 text-sm text-amber-300">
              Lendo informações do arquivo...
            </p>
          )}

          {hasAudio && (
            <button
              type="button"
              onClick={() =>
                onPreview({ ...form, startSec, endSec })
              }
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold"
            >
              <Play size={16} />
              Ouvir prévia do trecho
            </button>
          )}
        </div>

        {/* Spotify */}
        <div className="mt-4 rounded-2xl border border-[#1db954]/25 bg-[#1db954]/[.05] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#1db954]/10 p-3 text-[#1db954]">
              <Link2 />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Escolher música pelo Spotify
              </p>
              <p className="text-xs text-slate-400">
                Pesquise uma música e copie o link da faixa.
              </p>
            </div>
          </div>

          <a
            href="https://open.spotify.com/search"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1db954] px-4 text-sm font-bold text-black transition hover:bg-[#1ed760]"
          >
            <Search size={18} />
            Buscar no Spotify
            <ExternalLink size={16} />
          </a>

          <label className="mt-4 block">
            <span className={labelClass}>
              Link da faixa do Spotify
            </span>
            <input
              className={fieldClass}
              type="url"
              value={spotifyInput}
              onChange={(e) => updateSpotify(e.target.value)}
              placeholder="https://open.spotify.com/track/..."
            />
          </label>

          {form.spotifyTrackId && (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
              <iframe
                title="Prévia do Spotify"
                src={`https://open.spotify.com/embed/track/${form.spotifyTrackId}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />

              <a
                href={`https://open.spotify.com/track/${form.spotifyTrackId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border-t border-white/10 px-3 py-3 text-xs font-semibold text-[#1db954]"
              >
                <ExternalLink size={14} />
                Abrir esta música no Spotify
              </a>
            </div>
          )}

          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            O Spotify precisa de internet. O recorte, os fades e o
            volume configurados aqui são aplicados aos arquivos de
            áudio locais.
          </p>
        </div>

        {/* Recorte: controles visíveis quando a duração é conhecida */}
        {audioDuration > 0 && (
          <div className="mt-5 rounded-2xl bg-black/20 p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold">
              <Scissors size={17} className="text-gold" />
              Recorte do áudio
              <span className="ml-auto text-xs font-normal text-slate-400">
                Duração: {timeText(audioDuration)}
              </span>
            </div>

            <label className="mb-5 block">
              <span className={labelClass}>
                Início do trecho — {timeText(startSec)}
              </span>

              <input
                className="range-gold w-full cursor-pointer"
                type="range"
                min="0"
                max={maxStart}
                step="0.1"
                value={Math.min(startSec, maxStart)}
                onChange={(e) => changeStart(e.target.value)}
              />

              <input
                className={`${fieldClass} mt-2`}
                type="number"
                aria-label="Início em segundos"
                min="0"
                max={maxStart}
                step="0.1"
                value={startSec}
                onChange={(e) => changeStart(e.target.value)}
              />

              <span className="mt-1 block text-xs text-slate-500">
                Escolha em que segundo a música deve começar.
              </span>
            </label>

            <label className="block">
              <span className={labelClass}>
                Fim do trecho — {timeText(endSec)}
              </span>

              <input
                className="range-gold w-full cursor-pointer"
                type="range"
                min={minEnd}
                max={audioDuration}
                step="0.1"
                value={Math.min(
                  audioDuration,
                  Math.max(minEnd, endSec),
                )}
                onChange={(e) => changeEnd(e.target.value)}
              />

              <input
                className={`${fieldClass} mt-2`}
                type="number"
                aria-label="Fim em segundos"
                min={minEnd}
                max={audioDuration}
                step="0.1"
                value={endSec}
                onChange={(e) => changeEnd(e.target.value)}
              />

              <span className="mt-1 block text-xs text-slate-500">
                Escolha em que segundo a música deve terminar.
              </span>
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label>
                <span className={labelClass}>Fade in (s)</span>
                <input
                  className={fieldClass}
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.fadeIn ?? 0.5}
                  onChange={(e) =>
                    update(
                      'fadeIn',
                      Math.max(
                        0,
                        Math.min(5, Number(e.target.value) || 0),
                      ),
                    )
                  }
                />
              </label>

              <label>
                <span className={labelClass}>Fade out (s)</span>
                <input
                  className={fieldClass}
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.fadeOut ?? 1}
                  onChange={(e) =>
                    update(
                      'fadeOut',
                      Math.max(
                        0,
                        Math.min(5, Number(e.target.value) || 0),
                      ),
                    )
                  }
                />
              </label>

              <label>
                <span className={labelClass}>
                  Volume: {form.volume ?? 85}%
                </span>
                <input
                  className="range-gold mt-3 w-full"
                  type="range"
                  min="0"
                  max="100"
                  value={form.volume ?? 85}
                  onChange={(e) =>
                    update('volume', Number(e.target.value))
                  }
                />
              </label>
            </div>
          </div>
        )}

        {error && (
          <p
            className={`mt-4 rounded-xl border p-3 text-sm ${
              loadingAudio
                ? 'border-amber-400/20 bg-amber-500/10 text-amber-200'
                : 'border-red-400/20 bg-red-500/10 text-red-200'
            }`}
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-14 flex-1 rounded-xl border border-white/10 font-semibold"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={save}
            disabled={loadingAudio}
            className="flex min-h-14 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-gold font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={18} />
            Salvar entrada
          </button>
        </div>
      </section>
    </div>
  )
}
