
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
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext

      if (!AudioContextClass) {
        throw new Error(
          'Este navegador não oferece suporte à reprodução de áudio.'
        )
      }

      contextRef.current = new AudioContextClass()
    }

    return contextRef.current
  }, [])

  const unlock = useCallback(async () => {
    const context = getContext()

    if (context.state === 'suspended') {
      await context.resume()
    }

    setReady(true)
  }, [getContext])

  const stop = useCallback((fade = 0) => {
    tokenRef.current += 1

    clearTimeout(endTimerRef.current)

    const source = sourceRef.current
    const gain = gainRef.current
    const context = contextRef.current

    sourceRef.current = null
    gainRef.current = null

    if (source && context) {
      try {
        if (gain && fade > 0) {
          const now = context.currentTime

          gain.gain.cancelScheduledValues(now)
          gain.gain.setValueAtTime(
            Math.max(0.0001, gain.gain.value),
            now
          )
          gain.gain.linearRampToValueAtTime(
            0.0001,
            now + fade
          )

          source.stop(now + fade + 0.02)
        } else {
          source.stop()
        }
      } catch {
        // A reprodução pode já ter terminado.
      }
    }

    setPlaying(false)
    setCurrentTime(0)
  }, [])

  const play = useCallback(
    async (entry, { preview = false } = {}) => {
      if (!entry?.audioBlob) {
        throw new Error(
          'Adicione um arquivo de áudio a esta entrada primeiro.'
        )
      }

      stop(0)

      const token = tokenRef.current
      const context = getContext()

      if (context.state === 'suspended') {
        await context.resume()
      }

      const bytes = await entry.audioBlob.arrayBuffer()
      const buffer = await context.decodeAudioData(bytes.slice(0))

      // Não inicia uma reprodução cancelada durante o carregamento.
      if (token !== tokenRef.current) return

      const totalDuration = buffer.duration

      const requestedStart = Number(entry.startSec)
      const requestedEnd = Number(entry.endSec)

      const start = Math.max(
        0,
        Math.min(
          Number.isFinite(requestedStart) ? requestedStart : 0,
          totalDuration
        )
      )

      const end = Math.max(
        0,
        Math.min(
          Number.isFinite(requestedEnd) && requestedEnd > 0
            ? requestedEnd
            : totalDuration,
          totalDuration
        )
      )

      if (start >= end) {
        throw new Error(
          'O início precisa ser anterior ao fim. Ajuste o recorte e salve a entrada.'
        )
      }

      const length = end - start

      const source = context.createBufferSource()
      const gain = context.createGain()

      source.buffer = buffer
      source.connect(gain)
      gain.connect(context.destination)

      const now = context.currentTime

      const volume = Math.max(
        0,
        Math.min(1, Number(entry.volume ?? 85) / 100)
      )

      const fadeIn = preview
        ? 0
        : Math.min(
            Math.max(0, Number(entry.fadeIn) || 0),
            length / 2
          )

      const fadeOut = preview
        ? 0
        : Math.min(
            Math.max(0, Number(entry.fadeOut) || 0),
            length / 2
          )

      gain.gain.setValueAtTime(
        fadeIn > 0 ? 0.0001 : volume,
        now
      )

      if (fadeIn > 0) {
        gain.gain.linearRampToValueAtTime(
          volume,
          now + fadeIn
        )
      }

      if (fadeOut > 0) {
        gain.gain.setValueAtTime(
          volume,
          now + Math.max(fadeIn, length - fadeOut)
        )

        gain.gain.linearRampToValueAtTime(
          0.0001,
          now + length
        )
      }

      sourceRef.current = source
      gainRef.current = gain

      setDuration(length)
      setCurrentTime(0)
      setPlaying(true)
      setReady(true)

      source.onended = () => {
        if (token !== tokenRef.current) return

        clearTimeout(endTimerRef.current)

        sourceRef.current = null
        gainRef.current = null

        setPlaying(false)
        setCurrentTime(length)

        if (!preview) {
          onEnded?.(entry)
        }
      }

      // Segundo inicial e duração exata do trecho selecionado.
      source.start(now, start, length)

      const startedAt = performance.now()

      const tick = () => {
        if (
          token !== tokenRef.current ||
          !sourceRef.current
        ) {
          return
        }

        const elapsed = (performance.now() - startedAt) / 1000

        setCurrentTime(Math.min(length, elapsed))
        endTimerRef.current = setTimeout(tick, 100)
      }

      endTimerRef.current = setTimeout(tick, 100)
    },
    [getContext, onEnded, stop]
  )

  useEffect(() => {
    return () => {
      clearTimeout(endTimerRef.current)

      try {
        sourceRef.current?.stop()
      } catch {
        // A fonte pode já ter terminado.
      }

      contextRef.current?.close()
    }
  }, [])

  return {
    play,
    stop,
    unlock,
    playing,
    currentTime,
    duration,
    ready,
  }
}
