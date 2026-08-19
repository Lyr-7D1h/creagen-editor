import type { LucideProps } from 'lucide-react'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import type { LogLevel } from '../../sandbox/SandboxLog'

const LEVEL_META: Record<Extract<LogLevel, 'error' | 'warn'>, {
  Icon: React.ComponentType<LucideProps>
  iconColor: string
}> = {
  error: { Icon: AlertCircle, iconColor: 'var(--color-icon-error)' },
  warn: { Icon: AlertTriangle, iconColor: 'var(--color-icon-warn)' },
}

export function LevelBadge({ level, count, hidden }: {
  level: Extract<LogLevel, 'error' | 'warn'>
  count: number
  hidden: boolean
}) {
  if (count === 0 || hidden) return null
  const { Icon, iconColor } = LEVEL_META[level]
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold leading-none select-none opacity-80">
      <Icon className="size-3.25 shrink-0" style={{ color: iconColor }} />
      <span style={{ color: iconColor }}>{count > 999 ? '999+' : count}</span>
    </span>
  )
}
