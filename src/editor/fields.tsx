import { useState } from 'react'

type NumberFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  unit?: 'mm' | 'cm'
  min?: number
  max?: number
}

export function NumberField({ label, value, onChange, unit = 'mm', min = 0, max = 100000 }: NumberFieldProps) {
  const factor = unit === 'cm' ? 10 : 1
  const shown = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3, useGrouping: false }).format(value / factor)
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)

  function commit() {
    if (draft === null) return
    const input = draft.trim().replace(',', '.')
    const parsed = Number(input)
    const next = Math.round(parsed * factor * 1000) / 1000
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(input) || !Number.isFinite(next) || next < min || next > max) {
      setInvalid(true)
      setDraft(null)
      return
    }
    setInvalid(false)
    setDraft(null)
    if (next !== value) onChange(next)
  }

  return <label className="field">
    <span>{label}</span>
    <span className={'number-input' + (invalid ? ' invalid' : '')}>
      <input
        aria-label={label} aria-invalid={invalid}
        inputMode="decimal" value={draft ?? shown}
        title={invalid ? 'Wpisz liczbę od ' + min / factor + ' do ' + max / factor : undefined}
        onFocus={event => event.currentTarget.select()}
        onChange={event => { setInvalid(false); setDraft(event.target.value) }}
        onBlur={commit}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
      />
      <span aria-hidden="true">{unit}</span>
    </span>
  </label>
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return <label className="field">
    <span>{label}</span>
    <input value={draft ?? value} maxLength={80} aria-label={label} onChange={event => setDraft(event.target.value)} onBlur={() => {
      if (draft !== null && draft.trim() !== value) onChange(draft.trim())
      setDraft(null)
    }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
  </label>
}
