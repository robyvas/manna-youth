import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function Star({ size = 16, className = '' }: { size?: number; className?: string }) {
  return <img src="/manna-star.png" alt="" style={{ width: size, height: size }} className={`block object-contain ${className}`} />
}

export function Logo({ width, className = '' }: { width: number; className?: string }) {
  return <img src="/manna-logo.png" alt="Manna" style={{ width }} className={`block ${className}`} />
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
    <button onClick={onClick} className="press rounded-full border-0 bg-black/22 px-3.5 py-2 text-[13px] font-semibold text-cream">
      {children}
    </button>
  )
}

type Variant = 'cream' | 'ink' | 'outline' | 'muted'

const VARIANTS: Record<Variant, string> = {
  cream: 'bg-cream text-ink',
  ink: 'bg-ink text-cream',
  outline: 'border border-cream/25 bg-transparent text-cream hover:bg-white/5',
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
      className={`press flex w-full items-center justify-center gap-3 rounded-full font-bold ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function UserChip({ name, color, onClick }: { name: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title="Ieși din cont" className="press flex items-center gap-2 rounded-full border-0 bg-black/22 py-1 pl-1 pr-2.5 text-cream">
      <span style={{ background: color }} className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold">
        {name[0]?.toUpperCase()}
      </span>
      <span className="text-xs">{name.split(' ')[0]}</span>
      <Icon name="logout" size={14} className="opacity-70" />
    </button>
  )
}

export function Notice({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <div className={`anim-in rounded-xl px-3.5 py-3 text-[13px] leading-[1.4] ${strong ? 'bg-black/35' : 'bg-black/25'}`}>{children}</div>
  )
}

export function Spinner() {
  // On a weak connection the first load can take a while; say so instead of looking frozen.
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="screen items-center justify-center text-center">
      <Star size={56} className="anim-pulse" />
      {slow && (
        <div className="anim-in mt-5 max-w-[260px] text-[13px] leading-[1.4] text-cream/75">
          Se încarcă mai greu decât de obicei. Verifică internetul, pagina continuă singură.
        </div>
      )}
    </div>
  )
}

/** Brief confirmation that slides in from the top. */
export function useToast() {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])
  const show = (text: string) => setToast({ id: Date.now(), text })
  const node = toast ? (
    <div
      key={toast.id}
      style={{ animation: 'mn-toast 2.2s ease both' }}
      className="fixed left-1/2 top-[max(16px,env(safe-area-inset-top))] z-50 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-cream shadow-[0_8px_24px_rgba(0,0,0,.3)]"
    >
      <Icon name="check" size={16} />
      {toast.text}
    </div>
  ) : null
  return { show, node }
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

const ICONS = {
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  plus: 'M12 5v14M5 12h14',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  close: 'M6 6l12 12M18 6L6 18',
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`flex-none ${className}`}
    >
      <path d={ICONS[name]} />
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
