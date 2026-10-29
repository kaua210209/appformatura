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
