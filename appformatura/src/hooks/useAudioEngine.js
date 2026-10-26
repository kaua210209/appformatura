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
          'Este navegador não oferece suporte ao áudio necessário.'
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

  const stop = useCallback((fade = 0.08) => {
    tokenRef.current += 1

    clearTimeout(endTimerRef.current)

    const source = sourceRef.current
    const gain = gainRef.current
    const context = contextRef.current

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

          source.stop(now + fade + 0.015)
        } else {
          source.stop()
        }
      } catch {
        // A fonte de áudio pode já ter terminado.
      }
    }

    sourceRef.current = null
    gainRef.current = null

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

      // Interrompe qualquer reprodução anterior.
      stop(0)

      const token = tokenRef.current
      const context = getContext()

      if (context.state === 'suspended') {
        await context.resume()
      }

      // Converte o arquivo em um buffer reproduzível.
      const bytes = await entry.audioBlob.arrayBuffer()
      const buffer = await context.decodeAudioData(bytes.slice(0))

      // Evita iniciar uma reprodução cancelada.
      if (token !== tokenRef.current) return

      // O recorte é respeitado tanto na prévia quanto na reprodução.
      const start = Math.min(
        Math.max(0, Number(entry.startSec) || 0),
        buffer.duration
      )

      const requestedEnd = Number(entry.endSec)

      const end =
        requestedEnd > start
          ? Math.min(requestedEnd, buffer.duration)
          : buffer.duration

      const length = end - start

      if (length <= 0) {
        throw new Error(
          'O trecho selecionado é inválido. Ajuste o início e o fim.'
        )
      }

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
        ? 0.02
        : Math.min(
            Math.max(0, Number(entry.fadeIn) || 0),
            length / 2
          )

      const fadeOut = preview
        ? 0.02
        : Math.min(
            Math.max(0, Number(entry.fadeOut) || 0),
            length / 2
          )

      // Configura o volume inicial.
      gain.gain.setValueAtTime(
        fadeIn > 0 ? 0.0001 : volume,
        now
      )

      // Efeito de entrada gradual do som.
      if (fadeIn > 0) {
        gain.gain.linearRampToValueAtTime(
          volume,
          now + fadeIn
        )
      }

      // Efeito de saída gradual do som.
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

        sourceRef.current = null
        gainRef.current = null

        clearTimeout(endTimerRef.current)

        setPlaying(false)
        setCurrentTime(length)

        // A prévia não avança automaticamente para outra entrada.
        if (!preview) {
          onEnded?.(entry)
        }
      }

      // Inicia no segundo selecionado e toca apenas o trecho escolhido.
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
