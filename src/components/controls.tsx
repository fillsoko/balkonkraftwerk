import type { ReactNode } from 'react'

export function Group({
  title,
  summary,
  open,
  children,
}: {
  title: string
  summary?: string
  open?: boolean
  children: ReactNode
}) {
  return (
    <details className="group" open={open}>
      <summary>
        <span className="chev">▶</span>
        <span>{title}</span>
        {summary && <span className="sum">{summary}</span>}
      </summary>
      <div className="group-body">{children}</div>
    </details>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: string
  hint?: string
}) {
  const id = `s-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className="field">
      <label htmlFor={id}>
        <span className="f-name">{label}</span>
        <span className="f-val">{display}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <div className="f-hint">{hint}</div>}
    </div>
  )
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: T
  options: { id: T; label: string; hint?: string }[]
  onChange: (v: T) => void
  hint?: string
}) {
  const active = options.find((o) => o.id === value)
  return (
    <div className="field">
      <label>
        <span className="f-name">{label}</span>
      </label>
      <div className="seg-control" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={o.id === value}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {(active?.hint || hint) && <div className="f-hint">{active?.hint ?? hint}</div>}
    </div>
  )
}
