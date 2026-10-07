import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Star({ size = 16, className = '' }: { size?: number; className?: string }) {
  return <img src="/manna-star.png" alt="" style={{ width: size, height: size }} className={`block object-contain ${className}`} />
}

export function Logo({ width }: { width: number }) {
  return <img src="/manna-logo.png" alt="Manna" style={{ width }} className="block" />
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <div className="inline-block rounded-full bg-black/25 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.12em]">
      {children}
    </div>
  )
}

export function ScopeLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Star />
      <span className="text-[13px] font-bold tracking-[.1em]">{children}</span>
    </div>
  )
}

export function BackPill({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-full border-0 bg-black/22 px-3.5 py-2 text-[13px] font-semibold text-cream">
      {children}
    </button>
  )
}

type Variant = 'cream' | 'ink' | 'outline' | 'muted'

const VARIANTS: Record<Variant, string> = {
  cream: 'bg-cream text-ink',
  ink: 'bg-ink text-cream',
  outline: 'border border-cream/25 bg-transparent text-cream',
  muted: 'bg-black/20 text-cream/60',
}

export function Button({
  variant = 'cream',
  height = 56,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; height?: number }) {
  return (
    <button
      {...rest}
      style={{ height, ...rest.style }}
      className={`flex w-full items-center justify-center gap-3 rounded-full font-bold transition-colors duration-200 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function UserChip({ name, color, onClick }: { name: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title="Ieși" className="flex items-center gap-2 rounded-full border-0 bg-black/22 py-1 pl-1 pr-2.5 text-cream">
      <span style={{ background: color }} className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold">
        {name[0]?.toUpperCase()}
      </span>
      <span className="text-xs">{name.split(' ')[0]}</span>
    </button>
  )
}

export function Notice({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <div className={`rounded-xl px-3.5 py-3 text-[13px] leading-[1.4] ${strong ? 'bg-black/35' : 'bg-black/25'}`}>{children}</div>
  )
}

export function Spinner() {
  return (
    <div className="screen items-center justify-center">
      <Star size={56} className="anim-pulse" />
    </div>
  )
}

export function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.2z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

/** Stable color per person, for avatars of signed-in staff. */
export function colorFor(text: string) {
  const palette = ['#1f4d8f', '#2e7d4f', '#8b4a2d', '#6a3d9a', '#0f6f73', '#9c2b5b']
  let h = 0
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}
