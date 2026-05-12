import {
  Delete as DeleteIcon,
  ErrorOutline as ErrorIcon,
  FilterList as FilterListIcon,
  WarningAmber as WarnIcon,
} from '@mui/icons-material'
import type { SvgIconProps, Theme } from '@mui/material'
import {
  Box,
  Checkbox,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  List,
  useDynamicRowHeight,
  useListRef,
  type RowComponentProps,
} from 'react-window'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import type { Log, LogLevel, SandboxLog } from '../sandbox/SandboxLog'

const MONOSPACE = '"Consolas", "Monaco", "Lucida Console", monospace'

interface LevelConfig {
  /** Row background tint */
  rowBg: string
  rowHoverBg: string
  /** Text colour for the message */
  textColor: string
  /** Icon shown at the start of each row (null = no icon) */
  Icon: React.ComponentType<SvgIconProps> | null
  iconColor: string
  /** Label shown in the filter button */
  filterLabel: string | null
}

const getLevelConfig = (theme: Theme): Record<LogLevel, LevelConfig> => ({
  uncaught: {
    rowBg:
      theme.palette.mode === 'dark'
        ? 'rgba(244, 67, 54, 0.1)'
        : 'rgba(198, 40, 40, 0.07)',
    rowHoverBg:
      theme.palette.mode === 'dark'
        ? 'rgba(244, 67, 54, 0.15)'
        : 'rgba(198, 40, 40, 0.13)',
    textColor: theme.palette.error.main,
    Icon: ErrorIcon,
    iconColor: theme.palette.error.main,
    filterLabel: null,
  },
  error: {
    rowBg:
      theme.palette.mode === 'dark'
        ? 'rgba(244, 67, 54, 0.1)'
        : 'rgba(198, 40, 40, 0.07)',
    rowHoverBg:
      theme.palette.mode === 'dark'
        ? 'rgba(244, 67, 54, 0.15)'
        : 'rgba(198, 40, 40, 0.13)',
    textColor: theme.palette.error.main,
    Icon: ErrorIcon,
    iconColor: theme.palette.error.main,
    filterLabel: 'Errors',
  },
  warn: {
    rowBg:
      theme.palette.mode === 'dark'
        ? 'rgba(255, 152, 0, 0.1)'
        : 'rgba(230, 81, 0, 0.06)',
    rowHoverBg:
      theme.palette.mode === 'dark'
        ? 'rgba(255, 152, 0, 0.15)'
        : 'rgba(230, 81, 0, 0.12)',
    textColor: theme.palette.warning.main,
    Icon: WarnIcon,
    iconColor: theme.palette.warning.main,
    filterLabel: 'Warnings',
  },
  info: {
    rowBg: 'transparent',
    rowHoverBg: theme.palette.action.hover,
    textColor: theme.palette.text.primary,
    Icon: null,
    iconColor: theme.palette.info.main,
    filterLabel: 'Info',
  },
  debug: {
    rowBg: 'transparent',
    rowHoverBg: theme.palette.action.hover,
    textColor: theme.palette.text.secondary,
    Icon: null,
    iconColor: theme.palette.text.secondary,
    filterLabel: 'Debug',
  },
})

const ALL_LEVEL_FILTERS: LogLevel[] = ['error', 'warn', 'info', 'debug']

const ZERO_COUNTS = {
  warn: 0,
  error: 0,
}

/** Maximum number of visual lines rendered inside a single row.
 * Keeping this bounded prevents extreme row heights that break dynamic-height
 * scroll estimation in react-window. Very long output beyond this limit is
 * summarised rather than dropped so the user knows content was clipped.
 */
const MAX_DISPLAY_LINES = 30

function formatArg(a: unknown): string {
  if (typeof a === 'string') return a
  if (a instanceof Error) return `${a.name}: ${a.message}`
  try {
    return JSON.stringify(a, null)
  } catch {
    return String(a)
  }
}

function formatArgs(args: unknown[]): string {
  return args.map(formatArg).join(' ')
}

/**
 * Split `text` into at most `MAX_DISPLAY_LINES` lines.
 * Returns the truncated text and the number of hidden lines (0 = not truncated).
 */
function truncateLines(text: string): { visible: string; hiddenLines: number } {
  let lineCount = 0
  let splitPos = 0

  while (splitPos < text.length) {
    const next = text.indexOf('\n', splitPos)
    if (next === -1) {
      // No more newlines — this is the last line; nothing to truncate
      break
    }
    lineCount++
    if (lineCount === MAX_DISPLAY_LINES) {
      // Count remaining lines without slicing the whole string
      let remaining = 0
      let pos = next + 1
      while (pos < text.length) {
        const n = text.indexOf('\n', pos)
        remaining++
        if (n === -1) break
        pos = n + 1
      }
      return {
        visible: text.slice(0, next),
        hiddenLines: remaining,
      }
    }
    splitPos = next + 1
  }

  return { visible: text, hiddenLines: 0 }
}

/** Read a single Log entry by logical index (0 = oldest) from the circular buffer. */
function getLogAt(
  log: SandboxLog,
  logSize: number,
  index: number,
): Log | undefined {
  if (logSize === 0 || index < 0 || index >= logSize) return undefined
  const offset = logSize - 1 - index
  const result = log.view(offset, 1).next()
  return result.done ? undefined : (result.value as Log | undefined)
}

type RowProps = {
  log: SandboxLog
  logSize: number
  /** null = unfiltered; otherwise maps visible row index → log index */
  indexMap: number[] | null
}

function Row({
  index,
  style,
  ariaAttributes,
  log,
  logSize,
  indexMap,
}: RowComponentProps<RowProps>) {
  const theme = useTheme()
  const LEVEL_CONFIG = getLevelConfig(theme)

  const actualIndex = indexMap != null ? indexMap[index] : index
  if (actualIndex == null) return null
  const entry = getLogAt(log, logSize, actualIndex)
  if (!entry) return null

  const [level, args] = entry
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.info
  const { Icon } = cfg

  const { visible, hiddenLines } = truncateLines(formatArgs(args))

  return (
    <Box
      style={style}
      {...ariaAttributes}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '5px',
        px: '8px',
        py: '2px',
        backgroundColor: cfg.rowBg,
        borderBottom: '1px solid',
        borderBottomColor: 'divider',
        overflow: 'hidden',
        cursor: 'default',
        userSelect: 'text',
        boxSizing: 'border-box',
        '&:hover': { backgroundColor: cfg.rowHoverBg },
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Icon column — always 16 px wide to keep text aligned */}
      <Box
        aria-hidden
        sx={{
          width: 16,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pt: '3px', // optical alignment with first text line
        }}
      >
        {Icon != null && (
          <Icon
            sx={{ fontSize: '13px', color: cfg.iconColor, display: 'block' }}
          />
        )}
      </Box>

      {/* Message */}
      <Box
        component="span"
        sx={{
          color: cfg.textColor,
          fontFamily: MONOSPACE,
          fontSize: '0.75rem',
          lineHeight: '20px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          flex: 1,
          minWidth: 0,
        }}
      >
        {visible}
        {hiddenLines > 0 && (
          <Box
            component="span"
            sx={{
              display: 'block',
              color: 'text.disabled',
              fontStyle: 'italic',
              userSelect: 'none',
            }}
          >
            {`\u2026 ${hiddenLines} more ${hiddenLines === 1 ? 'line' : 'lines'} not shown`}
          </Box>
        )}
      </Box>
    </Box>
  )
}

function LevelFilterDropdown({
  hiddenLevels,
  levelCounts,
  onToggle,
}: {
  hiddenLevels: Set<LogLevel>
  levelCounts: typeof ZERO_COUNTS
  onToggle: (level: LogLevel) => void
}) {
  const theme = useTheme()
  const LEVEL_CONFIG = getLevelConfig(theme)

  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = Boolean(anchor)
  const hiddenCount = hiddenLevels.size

  return (
    <>
      <Tooltip title="Filter log levels" placement="bottom">
        <Box
          component="button"
          onClick={(e: React.MouseEvent<HTMLElement>) =>
            setAnchor(e.currentTarget)
          }
          aria-haspopup="true"
          aria-expanded={open}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            px: '5px',
            py: '2px',
            border: 'none',
            borderRadius: '4px',
            background: 'none',
            cursor: 'pointer',
            color: hiddenCount > 0 ? 'warning.main' : 'text.secondary',
            transition: 'background-color 0.1s',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <FilterListIcon sx={{ fontSize: '14px', display: 'block' }} />
          <Typography
            component="span"
            sx={{ fontSize: '0.65rem', fontWeight: 600, lineHeight: 1 }}
          >
            Levels
            {hiddenCount > 0 && (
              <Box
                component="span"
                sx={{ ml: '3px', opacity: 0.8 }}
              >{`(${ALL_LEVEL_FILTERS.length - hiddenCount}/${ALL_LEVEL_FILTERS.length})`}</Box>
            )}
          </Typography>
        </Box>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: {
            sx: { minWidth: 160 },
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {ALL_LEVEL_FILTERS.map((level) => {
          const { Icon, iconColor, filterLabel } = LEVEL_CONFIG[level]
          const enabled = !hiddenLevels.has(level)
          const count =
            level === 'error' || level === 'warn'
              ? levelCounts[level]
              : undefined

          return (
            <MenuItem
              key={level}
              onClick={() => onToggle(level)}
              dense
              sx={{ gap: '4px', py: '2px' }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <Checkbox
                  checked={enabled}
                  size="small"
                  disableRipple
                  sx={{ p: 0 }}
                />
              </ListItemIcon>

              {/* Level icon */}
              <Box
                aria-hidden
                sx={{
                  width: 14,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: enabled ? iconColor : 'text.disabled',
                }}
              >
                {Icon != null ? (
                  <Icon sx={{ fontSize: '13px', display: 'block' }} />
                ) : (
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: 'currentColor',
                    }}
                  />
                )}
              </Box>

              <ListItemText
                primary={filterLabel}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: '0.75rem',
                      color: enabled ? 'text.primary' : 'text.disabled',
                    },
                  },
                }}
              />

              {count != null && count > 0 && (
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.65rem',
                    color: enabled ? iconColor : 'text.disabled',
                    fontWeight: 600,
                    ml: 'auto',
                    pl: '8px',
                  }}
                >
                  {count > 999 ? '999+' : count}
                </Typography>
              )}
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}

export function ConsoleView() {
  const theme = useTheme()
  const LEVEL_CONFIG = getLevelConfig(theme)

  const {
    sandbox: { log },
  } = useCreagenEditor()

  const [logSize, setLogSize] = useState(log.size)

  // Per-level counts (sourced from SandboxLog which tracks them as logs arrive)
  const [levelCounts, setLevelCounts] = useState<typeof ZERO_COUNTS>(() => ({
    ...log.levelCounts,
  }))

  // Which levels are currently hidden (all visible by default)
  const [hiddenLevels, setHiddenLevels] = useState<Set<LogLevel>>(new Set())

  const listRef = useListRef(null)
  const isAtBottomRef = useRef(true)

  // resetKey bumped whenever we want useDynamicRowHeight to forget cached heights
  const [resetKey, setResetKey] = useState(0)
  const rowHeight = useDynamicRowHeight({ defaultRowHeight: 25, key: resetKey })

  // Sync totals
  useEffect(() => {
    return log.onUpdate(() => {
      setLogSize(log.size)
      setLevelCounts({ ...log.levelCounts })
    })
  }, [log])

  // Full reset when log is cleared (new sandbox render or manual clear)
  useEffect(() => {
    return log.onReset(() => {
      isAtBottomRef.current = true
      setResetKey((k) => k + 1)
      setLogSize(0)
      setLevelCounts({ ...ZERO_COUNTS })
    })
  }, [log])

  const isFiltered = hiddenLevels.size > 0

  /** Maps filtered row index => log index, or null when nothing is hidden */
  const indexMap = useMemo<number[] | null>(() => {
    if (!isFiltered) return null
    const map: number[] = []
    let i = 0
    for (const entry of log.view(0, logSize)) {
      if (entry && !hiddenLevels.has(entry[0])) map.push(i)
      i++
    }
    return map
  }, [log, logSize, hiddenLevels, isFiltered])

  const filteredCount = indexMap != null ? indexMap.length : logSize

  const toggleLevel = useCallback((level: LogLevel) => {
    setHiddenLevels((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
    // Height cache is keyed by row index; after filter changes the same
    // index maps to a different entry, so discard all cached measurements.
    setResetKey((k) => k + 1)
  }, [])

  // Auto scroll
  useEffect(() => {
    if (filteredCount === 0 || !listRef.current) return
    if (isAtBottomRef.current) {
      listRef.current.scrollToRow({ index: filteredCount - 1, align: 'end' })
    }
  }, [filteredCount, listRef])

  // Stable rowProps — only changes when the underlying data changes
  const rowProps = useMemo<RowProps>(
    () => ({ log, logSize, indexMap }),
    [log, logSize, indexMap],
  )

  // ── Render ───────────────────────────────────────────────────────────────

  const noOutput = logSize === 0
  const noMatch = !noOutput && filteredCount === 0

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          px: '4px',
          py: '2px',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
          minHeight: 28,
        }}
      >
        {/* Level filter dropdown + error/warn badges */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}
        >
          <LevelFilterDropdown
            hiddenLevels={hiddenLevels}
            levelCounts={levelCounts}
            onToggle={toggleLevel}
          />
          {(['error', 'warn'] as const).map((level) => {
            const count = levelCounts[level]
            if (count === 0) return null
            const { Icon, iconColor } = LEVEL_CONFIG[level]
            return (
              <Box
                key={level}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  color: hiddenLevels.has(level) ? 'text.disabled' : iconColor,
                  opacity: hiddenLevels.has(level) ? 0.45 : 1,
                }}
              >
                {Icon != null && (
                  <Icon sx={{ fontSize: '13px', display: 'block' }} />
                )}
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    lineHeight: 1,
                    color: 'inherit',
                  }}
                >
                  {count > 999 ? '999+' : count}
                </Typography>
              </Box>
            )
          })}
        </Box>

        {/* Clear */}
        <Tooltip title="Clear console">
          <span>
            <IconButton
              size="small"
              onClick={() => log.reset()}
              disabled={noOutput}
              sx={{ p: '2px' }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/*
       * The List is always mounted so react-window has time to initialise its
       * internal scroll container (w) before the first logs arrive. If we
       * conditionally unmount it, the first auto-scroll fires while w is still
       * null (a no-op), and there is no subsequent filteredCount change to
       * retry it.
       */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <List<RowProps>
          listRef={listRef}
          rowComponent={Row}
          rowCount={filteredCount}
          rowHeight={rowHeight}
          rowProps={rowProps}
          onScroll={(e) => {
            const el = e.currentTarget
            const distFromBottom =
              el.scrollHeight - el.scrollTop - el.clientHeight
            isAtBottomRef.current = distFromBottom < 48
          }}
          style={{ height: '100%', width: '100%' }}
        />
        {(noOutput || noMatch) && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontFamily: MONOSPACE,
                fontSize: '0.75rem',
              }}
            >
              {noOutput
                ? 'Console output from the sandbox will appear here'
                : 'No messages match the current filter'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
