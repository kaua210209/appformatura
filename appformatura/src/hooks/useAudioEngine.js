import { useCallback, useEffect, useRef, useState } from 'react'

export function useAudioEngine({ onEnded } = {}) {
  const contextRef = useRef(null)
  const sourceRef = useRef(null)
  const gainRef = useRef(null)
  const endTimerRef = useRef(null)
  const tokenRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [ready, setReady] = useState(false)

  const getContext = useCallback(() => {
    if (!contextRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) throw new Error('Este navegador não oferece suporte ao áudio necessário.')
      contextRef.current = new Ctx()
    }
    return contextRef.current
  }, [])

  const unlock = useCallback(async () => {
    const ctx = getContext()
    if (ctx.state === 'suspended') await ctx.resume()
    setReady(true)
  }, [getContext])

  const stop = useCallback((fade = 0.08) => {
    tokenRef.current += 1
    clearTimeout(endTimerRef.current)
    const source = sourceRef.current
    const gain = gainRef.current
    const ctx = contextRef.current
    if (source && ctx) {
      try {
        if (gain && fade > 0) {
          const now = ctx.currentTime
          gain.gain.cancelScheduledValues(now)
          gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now)
          gain.gain.linearRampToValueAtTime(0.0001, now + fade)
          source.stop(now + fade + 0.015)
        } else source.stop()
      } catch { /* a fonte já pode ter terminado */ }
    }
    sourceRef.current = null
    gainRef.current = null
    setPlaying(false)
    setCurrentTime(0)
  }, [])

  const play = useCallback(async (entry, { preview = false } = {}) => {
    if (!entry?.audioBlob) throw new Error('Adicione um arquivo de áudio a esta entrada primeiro.')
    stop(0)
    const token = tokenRef.current
    const ctx = getContext()
    if (ctx.state === 'suspended') await ctx.resume()
    const bytes = await entry.audioBlob.arrayBuffer()
    const buffer = await ctx.decodeAudioData(bytes.slice(0))
    if (token !== tokenRef.current) return
    const start = preview ? 0 : Math.max(0, Number(entry.startSec) || 0)
    const end = preview ? buffer.duration : Math.min(buffer.duration, Number(entry.endSec) > start ? Number(entry.endSec) : buffer.duration)
    const length = Math.max(0.05, end - start)
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffer
    source.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    const volume = Math.max(0, Math.min(1, Number(entry.volume ?? 85) / 100))
    const fadeIn = preview ? 0.02 : Math.min(Math.max(0, Number(entry.fadeIn) || 0), length / 2)
    const fadeOut = preview ? 0.02 : Math.min(Math.max(0, Number(entry.fadeOut) || 0), length / 2)
    gain.gain.setValueAtTime(fadeIn ? 0.0001 : volume, now)
    if (fadeIn) gain.gain.linearRampToValueAtTime(volume, now + fadeIn)
    if (fadeOut) {
      gain.gain.setValueAtTime(volume, now + Math.max(fadeIn, length - fadeOut))
      gain.gain.linearRampToValueAtTime(0.0001, now + length)
    }
    sourceRef.current = source
    gainRef.current = gain
    setDuration(length)
    setCurrentTime(0)
    setPlaying(true)
    setReady(true)
    source.onended = () => {
      if (token !== tokenRef.current) return
      sourceRef.current = null
      gainRef.current = null
      setPlaying(false)
      setCurrentTime(length)
      if (!preview) onEnded?.(entry)
    }
    source.start(now, start, length)
    const startedAt = performance.now()
    const tick = () => {
      if (token !== tokenRef.current || !sourceRef.current) return
      setCurrentTime(Math.min(length, (performance.now() - startedAt) / 1000))
      endTimerRef.current = setTimeout(tick, 100)
    }
    endTimerRef.current = setTimeout(tick, 100)
  }, [getContext, onEnded, stop])

  useEffect(() => () => {
    clearTimeout(endTimerRef.current)
    try { sourceRef.current?.stop() } catch { /* ignore */ }
    contextRef.current?.close()
  }, [])

  return { play, stop, unlock, playing, currentTime, duration, ready }
}
