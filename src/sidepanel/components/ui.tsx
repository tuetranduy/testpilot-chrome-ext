import type { ButtonHTMLAttributes, ReactNode, SVGProps } from 'react'

export type IconName =
  | 'scan'
  | 'fill'
  | 'history'
  | 'settings'
  | 'sparkles'
  | 'upload'
  | 'download'
  | 'trash'
  | 'chevron'
  | 'check'
  | 'lock'
  | 'globe'
  | 'file'
  | 'image'
  | 'server'

export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg role="img" aria-label="TestPilot icon" viewBox="0 0 128 128" fill="none" className={className}>
      <defs>
        <linearGradient id="brand-mark-bg" x1="22" y1="14" x2="106" y2="116" gradientUnits="userSpaceOnUse">
          <stop stopColor="#182841" />
          <stop offset="1" stopColor="#09111F" />
        </linearGradient>
        <linearGradient id="brand-mark-accent" x1="27" y1="27" x2="101" y2="101" gradientUnits="userSpaceOnUse">
          <stop stopColor="#70E5AA" />
          <stop offset="1" stopColor="#36BD78" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="118" height="118" rx="29" fill="url(#brand-mark-bg)" />
      <rect x="6" y="6" width="116" height="116" rx="28" stroke="#30425F" strokeWidth="2" />
      <path d="M43 28H31C29.343 28 28 29.343 28 31V43M85 28H97C98.657 28 100 29.343 100 31V43M28 85V97C28 98.657 29.343 100 31 100H43M100 85V97C100 98.657 98.657 100 97 100H85" stroke="url(#brand-mark-accent)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 66L57 81L88 48" stroke="#F4F7FB" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Icon({ name, className = 'h-4 w-4', ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const content: Record<IconName, ReactNode> = {
    scan: <><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /><rect x="7" y="8" width="10" height="8" rx="2" /></>,
    fill: <><path d="m12 3 1.35 3.65L17 8l-3.65 1.35L12 13l-1.35-3.65L7 8l3.65-1.35L12 3Z" /><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" /><path d="M5 14v6M2 17h6" /></>,
    history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.49-6.01L3.5 8.5" /><path d="M3.5 4v4.5H8" /><path d="M12 7v5l3 2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-3v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 7.2 15a1.65 1.65 0 0 0-1.51-1H5.6v-3h.09A1.65 1.65 0 0 0 7.2 10a1.65 1.65 0 0 0-.33-1.82l-.06-.06L8.93 6l.06.06A1.65 1.65 0 0 0 10.8 6.4a1.65 1.65 0 0 0 1-1.51V4.8h3v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.12 2.12-.06.06A1.65 1.65 0 0 0 19.4 10a1.65 1.65 0 0 0 1.51 1H21v3h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
    sparkles: <><path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3Z" /><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
    download: <><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 19h16" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 2-2 5 4" /></>,
    server: <><rect x="4" y="4" width="16" height="6" rx="2" /><rect x="4" y="14" width="16" height="6" rx="2" /><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5" /></>,
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {content[name]}
    </svg>
  )
}

export function Button({
  variant = 'primary',
  size = 'default',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'default' | 'small' | 'icon'
}) {
  const base = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,border-color,color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none'
  const variants = {
    primary: 'border border-cta bg-cta text-cta-text shadow-button hover:border-cta-hover hover:bg-cta-hover active:bg-cta-pressed',
    secondary: 'border border-border-strong bg-surface-raised text-text hover:border-border-hover hover:bg-surface-hover active:bg-surface',
    ghost: 'border border-transparent bg-transparent text-muted hover:bg-surface-hover hover:text-text active:bg-surface',
    danger: 'border border-danger/30 bg-danger/10 text-danger hover:border-danger/50 hover:bg-danger/15',
  }
  const sizes = {
    default: 'min-h-10 px-3.5 py-2 text-[13px]',
    small: 'min-h-8 px-2.5 py-1.5 text-xs',
    icon: 'h-9 w-9 p-0',
  }
  return <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
}

export function Badge({ tone = 'muted', children }: { tone?: 'success' | 'muted' | 'danger' | 'warning'; children: ReactNode }) {
  const tones = {
    success: 'border-cta/20 bg-cta/10 text-cta-soft',
    muted: 'border-border bg-bg/40 text-muted',
    danger: 'border-danger/20 bg-danger/10 text-danger',
    warning: 'border-warning/20 bg-warning/10 text-warning',
  }
  const dots = {
    success: 'bg-cta',
    muted: 'bg-muted',
    danger: 'bg-danger',
    warning: 'bg-warning',
  }
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold leading-none ${tones[tone]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-surface p-4 shadow-card ${className}`}>{children}</section>
}

export function SectionTitle({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return (
    <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold tracking-tight text-text">
      {icon && <Icon name={icon} className="h-4 w-4 shrink-0 text-cta-soft" />}
      {children}
    </h2>
  )
}

export function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
}

export function EmptyState({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border-strong bg-bg/35 px-4 py-7 text-center">
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-raised text-muted">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="text-[13px] font-semibold text-text">{title}</p>
      <p className="mt-1 max-w-[30ch] text-xs leading-5 text-muted">{description}</p>
    </div>
  )
}

export function InlineMessage({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' }) {
  const tones = {
    info: 'border-border bg-bg/40 text-muted',
    error: 'border-danger/25 bg-danger/10 text-danger',
    success: 'border-cta/25 bg-cta/10 text-cta-soft',
  }
  return <div role={tone === 'error' ? 'alert' : undefined} className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${tones[tone]}`}>{children}</div>
}

export const fieldClassName = 'min-h-10 w-full rounded-xl border border-border-strong bg-bg/70 px-3 py-2 text-[13px] text-text shadow-input outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-subtle hover:border-border-hover focus:border-cta focus:ring-2 focus:ring-cta/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none'
