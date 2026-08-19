import type { LucideProps } from 'lucide-react'
import { ListFilter, AlertCircle, AlertTriangle } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Checkbox from '@radix-ui/react-checkbox'
import type { LogLevel } from '../../sandbox/SandboxLog'
import { ALL_LEVEL_FILTERS } from './log-levels'

const LEVEL_META: Record<LogLevel, {
  Icon: React.ComponentType<LucideProps> | null
  iconColor: string
  dotColor: string
  filterLabel: string | null
}> = {
  uncaught: { Icon: AlertCircle, iconColor: 'var(--color-icon-error)', dotColor: 'var(--color-icon-error)', filterLabel: 'Uncaught Errors' },
  error: { Icon: AlertCircle, iconColor: 'var(--color-icon-error)', dotColor: 'var(--color-icon-error)', filterLabel: 'Errors' },
  warn: { Icon: AlertTriangle, iconColor: 'var(--color-icon-warn)', dotColor: 'var(--color-icon-warn)', filterLabel: 'Warnings' },
  info: { Icon: null, iconColor: 'var(--color-icon-info)', dotColor: 'var(--color-icon-info)', filterLabel: 'Info' },
  debug: { Icon: null, iconColor: 'var(--color-icon-debug)', dotColor: 'var(--color-icon-debug)', filterLabel: 'Debug' },
}

export function LevelFilterDropdown({ hiddenLevels, onToggle }: {
  hiddenLevels: Set<LogLevel>
  onToggle: (level: LogLevel) => void
}) {
  const hiddenCount = hiddenLevels.size
  const enabledCount = ALL_LEVEL_FILTERS.length - hiddenCount

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-haspopup="true"
          aria-expanded={hiddenCount > 0}
          className={[
            'inline-flex items-center gap-1 rounded-sm bg-transparent px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors duration-100 cursor-pointer select-none outline-none',
            'focus-visible:ring-2 focus-visible:ring-(--color-icon-warn) focus-visible:ring-offset-1',
            hiddenCount > 0 ? 'text-(--color-icon-warn)' : 'text-(--color-text-secondary)',
            'hover:bg-(--color-bg-hover)',
          ].join(' ')}
        >
          <ListFilter className="size-3.5 shrink-0" />
          <span>Levels</span>
          {hiddenCount > 0 && (
            <span className="ml-0.75 opacity-80">
              ({enabledCount}/{ALL_LEVEL_FILTERS.length})
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        sideOffset={2}
        className="z-50 min-w-40 rounded-md border border-(--color-border) bg-white p-1 shadow-lg"
        side="bottom"
        align="start"
      >
          {ALL_LEVEL_FILTERS.map((level) => {
            const { Icon, iconColor, dotColor, filterLabel } = LEVEL_META[level]
            const enabled = !hiddenLevels.has(level)
            return (
              <DropdownMenu.Item
                key={level}
                onSelect={(e) => { onToggle(level); e.preventDefault(); }}
                className="relative flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm outline-none select-none cursor-pointer focus:bg-(--color-bg-hover)"
              >
                <DropdownMenu.ItemIndicator className="absolute left-0 flex items-center justify-center w-7">
                  <Checkbox.Root
                    checked={enabled}
                    className="ml-1 size-3.5 shrink-0 rounded-sm border border-zinc-300 bg-white flex items-center justify-center data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900"
                  >
                    <Checkbox.Indicator className="flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 8 8">
                        <path d="M1.5 4.5 L3.5 6.5 L7 1.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                </DropdownMenu.ItemIndicator>
                <span className="flex items-center justify-center w-3.5 shrink-0" aria-hidden>
                  {Icon
                    ? <Icon className="size-3.25 shrink-0" style={{ color: iconColor }} />
                    : <span className="size-1.25 rounded-full bg-[currentColor]" style={{ color: enabled ? dotColor : 'var(--color-text-disabled)' }} />
                  }
                </span>
                <span className={["flex-1 truncate", enabled ? 'text-zinc-900' : 'text-zinc-400'].join(' ')}>
                  {filterLabel}
                </span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
