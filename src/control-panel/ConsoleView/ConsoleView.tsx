import { Trash2 } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { List, useDynamicRowHeight, useListRef, type RowComponentProps } from 'react-window'
import { useCreagenEditor } from '../../creagen-editor/CreagenContext'
import type { Log, LogLevel, SandboxLog } from '../../sandbox/SandboxLog'
import { LevelBadge } from './LevelBadge'
import { LevelFilterDropdown } from './LevelFilterDropdown'
import { ZERO_COUNTS } from './log-levels'

const MAX_DISPLAY_LINES = 30

function formatArg(a: unknown): string {
  if (typeof a === 'string') return a
  if (a instanceof Error) return `${a.name}: ${a.message}`
  if (typeof a === 'number') {
    if (Number.isNaN(a)) return 'NaN'
    if (a === Infinity) return 'Infinity'
    if (a === -Infinity) return '-Infinity'
  }
  if (a === undefined) return 'undefined'
  if (a === null) return 'null'
  try { return JSON.stringify(a, null) } catch {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(a)
  }
}

function formatArgs(args: unknown[]) { return args.map(formatArg).join(' ') }

function truncateLines(text: string): { visible: string; hiddenLines: number } {
  let lineCount = 0, splitPos = 0
  while (splitPos < text.length) {
    const next = text.indexOf('\n', splitPos)
    if (next === -1) break
    lineCount++
    if (lineCount === MAX_DISPLAY_LINES) {
      let remaining = 0, pos = next + 1
      while (pos < text.length) { const n = text.indexOf('\n', pos); remaining++; if (n === -1) break; pos = n + 1 }
      return { visible: text.slice(0, next), hiddenLines: remaining }
    }
    splitPos = next + 1
  }
  return { visible: text, hiddenLines: 0 }
}

function getLogAt(log: SandboxLog, logSize: number, index: number): Log | undefined {
  if (logSize === 0 || index < 0 || index >= logSize) return undefined
  const result = log.view(logSize - 1 - index, 1).next()
  return result.done ? undefined : (result.value as Log | undefined)
}

type RowProps = { log: SandboxLog; logSize: number; indexMap: number[] | null }

function Row({ index, style, ariaAttributes, log, logSize, indexMap }: RowComponentProps<RowProps>) {
  const actualIndex = indexMap != null ? indexMap[index] : index
  if (actualIndex == null) return null
  const entry = getLogAt(log, logSize, actualIndex)
  if (!entry) return null
  const [level] = entry

  const rowClass = `border-(--color-border) ${level === 'uncaught' || level === 'error' ? 'bg-(--color-bg-error) hover:bg-(--color-bg-error-hover)' : level === 'warn' ? 'bg-(--color-bg-warn) hover:bg-(--color-bg-warn-hover)' : 'hover:bg-(--color-bg-hover)'}`
  const textClass = level === 'uncaught' || level === 'error' ? 'text-(--color-icon-error)'
    : level === 'warn' ? 'text-(--color-icon-warn)'
    : level === 'info' ? 'text-(--color-text-primary)'
    : 'text-(--color-text-secondary)'

  const { visible, hiddenLines } = truncateLines(formatArgs(entry[1]))

  return (
    <div style={style} {...ariaAttributes} className={`flex items-start gap-1.25 px-2 py-0.5 overflow-hidden cursor-default select-text box-border ${rowClass} last:border-b-0`}>
      <span aria-hidden className="w-4 shrink-0 flex items-center justify-center pt-0.75" />
      <span className={`flex-1 min-w-0 text-[0.75rem] leading-5 whitespace-pre-wrap break-all font-mono ${textClass}`}>
        {visible}
        {hiddenLines > 0 && (
          <span className="block text-(--color-text-disabled) italic select-none">
            {`\u2026 ${hiddenLines} more ${hiddenLines === 1 ? 'line' : 'lines'} not shown`}
          </span>
        )}
      </span>
    </div>
  )
}

export function ConsoleView() {
  const { sandbox: { log } } = useCreagenEditor()
  const [logSize, setLogSize] = useState(log.size)
  const [levelCounts, setLevelCounts] = useState<typeof ZERO_COUNTS>(() => ({ ...log.levelCounts }))
  const [hiddenLevels, setHiddenLevels] = useState<Set<LogLevel>>(new Set())
  const listRef = useListRef(null)
  const isAtBottomRef = useRef(true)
  const [resetKey, setResetKey] = useState(0)
  const rowHeight = useDynamicRowHeight({ defaultRowHeight: 25, key: resetKey })

  useEffect(() => log.onUpdate(() => { setLogSize(log.size); setLevelCounts({ ...log.levelCounts }) }), [log])
  useEffect(() => log.onReset(() => { isAtBottomRef.current = true; setResetKey(k => k + 1); setLogSize(0); setLevelCounts({ ...ZERO_COUNTS }) }), [log])

  const isFiltered = hiddenLevels.size > 0
  const indexMap = useMemo<number[] | null>(() => {
    if (!isFiltered) return null
    const map: number[] = []; let i = 0
    for (const entry of log.view(0, logSize)) { if (entry && !hiddenLevels.has(entry[0])) map.push(i); i++ }
    return map
  }, [log, logSize, hiddenLevels, isFiltered])

  const filteredCount = indexMap != null ? indexMap.length : logSize

  const toggleLevel = useCallback((level: LogLevel) => {
    setHiddenLevels(prev => { const next = new Set(prev); if (next.has(level)) next.delete(level); else next.add(level); return next })
    setResetKey(k => k + 1)
  }, [])

  useEffect(() => { if (filteredCount === 0 || !listRef.current) return; if (isAtBottomRef.current) listRef.current.scrollToRow({ index: filteredCount - 1, align: 'end' }) }, [filteredCount, listRef])

  const rowProps = useMemo<RowProps>(() => ({ log, logSize, indexMap }), [log, logSize, indexMap])
  const noOutput = logSize === 0
  const noMatch = !noOutput && filteredCount === 0

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-0.5 px-1 py-0.5 border-b border-(--color-border) shrink-0 min-h-7">
          <div className="flex items-center gap-1 flex-1">
            <LevelFilterDropdown hiddenLevels={hiddenLevels} onToggle={toggleLevel} />
            {(['error', 'warn'] as const).map(level => (
              <LevelBadge key={level} level={level} count={levelCounts[level]} hidden={hiddenLevels.has(level)} />
            ))}
          </div>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button disabled={noOutput} onClick={() => log.reset()} className="p-0.5 rounded-sm disabled:opacity-40 disabled:cursor-default text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-(--color-bg-hover) transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-(--color-icon-warn) focus-visible:ring-offset-1 cursor-pointer outline-none">
                <Trash2 className="size-3.5" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content sideOffset={4} className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-white shadow-lg animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-1" side="bottom" align="center">
                Clear console
                <Tooltip.Arrow className="fill-zinc-800" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <List<RowProps>
            listRef={listRef} rowComponent={Row} rowCount={filteredCount} rowHeight={rowHeight} rowProps={rowProps}
            onScroll={e => { const el = e.currentTarget; isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48 }}
            style={{ height: '100%', width: '100%' }}
          />
          {(noOutput || noMatch) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[0.75rem] font-mono text-(--color-text-disabled)">
                {noOutput ? 'Console output from the sandbox will appear here' : 'No messages match the current filter'}
              </span>
            </div>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  )
}
