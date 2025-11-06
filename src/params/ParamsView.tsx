import React from 'react'
import { useForceUpdateOnEditorEvent } from '../events/useEditorEvents'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  Shuffle as ShuffleIcon,
} from '@mui/icons-material'
import type { ParamConfig, ParamKey } from './Params'
import { Params } from './Params'
import { useSettings } from '../events/useEditorEvents'
import { generateHumanReadableName } from '../vcs/generateHumanReadableName'

function StringInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [localValue, setLocalValue] = React.useState(value)

  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <TextField
      fullWidth
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onChange((e.target as HTMLInputElement).value)
        }
      }}
      size="small"
    />
  )
}

function SeedInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [localValue, setLocalValue] = React.useState(value)

  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleGenerateNew = () => {
    const newSeed = generateHumanReadableName()
    setLocalValue(newSeed)
    onChange(newSeed)
  }

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <TextField
        fullWidth
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onChange((e.target as HTMLInputElement).value)
          }
        }}
        size="small"
        placeholder="Enter seed value"
      />
      <Tooltip title="Generate new seed">
        <IconButton onClick={handleGenerateNew} size="small" sx={{ p: 0.5 }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}

function ParamControl({
  config,
  value,
  onChange,
}: {
  config: ParamConfig
  value: unknown
  onChange: (newValue: unknown) => void
}) {
  let control: React.ReactNode

  switch (config.type) {
    case 'boolean':
      control = (
        <Switch
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          size="small"
        />
      )
      break

    case 'number': {
      const numValue = typeof value === 'number' ? value : config.default
      const min = config.min
      const max = config.max
      const step = config.step ?? 1

      control = (
        <TextField
          type="number"
          value={numValue}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val) && Params.isValidValue(config, val)) {
              onChange(val)
            }
          }}
          slotProps={{
            htmlInput: {
              min,
              max,
              step,
            },
          }}
          size="small"
          fullWidth
        />
      )
      break
    }

    case 'number-slider': {
      const numValue = typeof value === 'number' ? value : config.default
      const min = config.min
      const max = config.max
      const step = config.step ?? 1

      control = (
        <Stack direction="column" spacing={0.5} sx={{ width: '100%' }}>
          <TextField
            type="number"
            value={numValue}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val) && Params.isValidValue(config, val)) {
                onChange(val)
              }
            }}
            slotProps={{
              htmlInput: {
                min,
                max,
                step,
              },
            }}
            size="small"
            fullWidth
          />
          <Slider
            value={numValue}
            onChange={(_, newValue) => {
              if (Params.isValidValue(config, newValue)) {
                onChange(newValue)
              }
            }}
            min={min}
            max={max}
            step={step}
            valueLabelDisplay="auto"
            size="small"
          />
        </Stack>
      )
      break
    }

    case 'text': {
      const strValue = typeof value === 'string' ? value : config.default
      control = <StringInput value={strValue} onChange={onChange} />
      break
    }

    case 'range': {
      const rangeValue = (Array.isArray(value) ? value : config.default) as [
        number,
        number,
      ]
      const min = config.min
      const max = config.max
      const step = config.step

      control = (
        <Stack direction="row" spacing={0.5}>
          <TextField
            type="number"
            value={rangeValue[0]}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val)) {
                // Ensure min doesn't go above max
                const newMin = Math.min(val, rangeValue[1])
                const newValue: [number, number] = [newMin, rangeValue[1]]
                if (Params.isValidValue(config, newValue)) {
                  onChange(newValue)
                }
              }
            }}
            slotProps={{
              htmlInput: {
                min,
                max: rangeValue[1],
                step,
              },
            }}
            size="small"
            fullWidth
          />
          <TextField
            type="number"
            value={rangeValue[1]}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val)) {
                // Ensure max doesn't go below min
                const newMax = Math.max(val, rangeValue[0])
                const newValue: [number, number] = [rangeValue[0], newMax]
                if (Params.isValidValue(config, newValue)) {
                  onChange(newValue)
                }
              }
            }}
            slotProps={{
              htmlInput: {
                min: rangeValue[0],
                max,
                step,
              },
            }}
            size="small"
            fullWidth
          />
        </Stack>
      )
      break
    }

    case 'range-slider': {
      const rangeValue = (Array.isArray(value) ? value : config.default) as [
        number,
        number,
      ]
      const min = config.min
      const max = config.max
      const step = config.step

      control = (
        <Stack direction="column" spacing={0.5} sx={{ width: '100%' }}>
          <Stack direction="row" spacing={0.5}>
            <TextField
              type="number"
              value={rangeValue[0]}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val)) {
                  // Ensure min doesn't go above max
                  const newMin = Math.min(val, rangeValue[1])
                  const newValue: [number, number] = [newMin, rangeValue[1]]
                  if (Params.isValidValue(config, newValue)) {
                    onChange(newValue)
                  }
                }
              }}
              slotProps={{
                htmlInput: {
                  min,
                  max: rangeValue[1],
                  step,
                },
              }}
              size="small"
              fullWidth
            />
            <TextField
              type="number"
              value={rangeValue[1]}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val)) {
                  // Ensure max doesn't go below min
                  const newMax = Math.max(val, rangeValue[0])
                  const newValue: [number, number] = [rangeValue[0], newMax]
                  if (Params.isValidValue(config, newValue)) {
                    onChange(newValue)
                  }
                }
              }}
              slotProps={{
                htmlInput: {
                  min: rangeValue[0],
                  max,
                  step,
                },
              }}
              size="small"
              fullWidth
            />
          </Stack>
          <Slider
            value={rangeValue}
            onChange={(_, newValue) => {
              const val = newValue as [number, number]
              if (Params.isValidValue(config, val)) {
                onChange(val)
              }
            }}
            min={min}
            max={max}
            step={step}
            valueLabelDisplay="auto"
            size="small"
          />
        </Stack>
      )
      break
    }

    case 'seed': {
      let defaultValue = ''
      if (config.default !== undefined && config.default !== null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        defaultValue =
          typeof config.default === 'function'
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              config.default()
            : config.default
      }
      const seedValue = typeof value === 'string' ? value : defaultValue
      control = <SeedInput value={seedValue} onChange={onChange} />
      break
    }

    case 'radio': {
      const items = config.items
      // Find the key that matches the current value
      const selectedKey =
        Object.keys(items).find((key) => items[key] === value) ??
        Object.keys(items)[0] ??
        ''

      control = (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${config.columns ?? 2}, 1fr)`,
            gap: 0.5,
          }}
        >
          {Object.keys(items).map((key) => (
            <Box
              key={key}
              onClick={() => onChange(items[key])}
              sx={{
                px: 1,
                py: 0.5,
                border: 1,
                borderColor: selectedKey === key ? 'primary.main' : 'divider',
                bgcolor: selectedKey === key ? 'primary.main' : 'transparent',
                color:
                  selectedKey === key ? 'primary.contrastText' : 'text.primary',
                borderRadius: 0.5,
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                userSelect: 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor:
                    selectedKey === key ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              {key}
            </Box>
          ))}
        </Box>
      )
      break
    }

    default:
      control = (
        <Typography variant="body2" color="text.secondary">
          Unknown parameter type
        </Typography>
      )
  }

  return (
    <Box
      sx={{
        minHeight: 32,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {control}
    </Box>
  )
}

function generateRandomValue(config: ParamConfig): unknown {
  switch (config.type) {
    case 'boolean':
      return Math.random() > 0.5
    case 'number':
    case 'number-slider': {
      const min = config.min
      const max = config.max
      const step = config.step

      if (step !== undefined) {
        // Generate value aligned to step
        const steps = Math.floor((max - min) / step)
        const randomValue = min + Math.floor(Math.random() * (steps + 1)) * step
        // Ensure value is within bounds and round to appropriate precision
        const clampedValue = Math.min(max, Math.max(min, randomValue))
        // Determine decimal places based on step
        const decimalPlaces = step < 0.01 ? 4 : step < 1 ? 2 : 0
        return Number(clampedValue.toFixed(decimalPlaces))
      }

      // No step specified, generate random value with 2 decimal places
      const randomValue = min + Math.random() * (max - min)
      const clampedValue = Math.min(max, Math.max(min, randomValue))
      return Number(clampedValue.toFixed(2))
    }
    case 'text':
      // For text, just generate a random short string
      return Math.random().toString(36).substring(2, 8)
    case 'range':
    case 'range-slider': {
      const min = config.min
      const max = config.max

      // No step specified, generate random values with 2 decimal places
      const val1 = min + Math.random() * (max - min)
      const val2 = min + Math.random() * (max - min)
      const clampedVal1 = Number(Math.min(max, Math.max(min, val1)).toFixed(2))
      const clampedVal2 = Number(Math.min(max, Math.max(min, val2)).toFixed(2))

      return clampedVal1 <= clampedVal2
        ? [clampedVal1, clampedVal2]
        : [clampedVal2, clampedVal1]
    }
    case 'seed':
      return generateHumanReadableName()
    case 'radio': {
      const values = Object.values(config.items)
      return values[Math.floor(Math.random() * values.length)]
    }
  }
}

function ParamItem({
  paramKey,
  config,
  value,
  compact,
  onChange,
}: {
  paramKey: string
  config: ParamConfig
  value: unknown
  compact: boolean
  onChange: (newValue: unknown) => void
}) {
  const label = (
    <Box sx={{ minWidth: compact ? 'auto' : 120, flexShrink: 0 }}>
      <Typography
        variant="caption"
        component="div"
        noWrap={compact}
        sx={{ fontWeight: 500 }}
      >
        {paramKey}
        {compact &&
          (config.type === 'number' ||
            config.type === 'number-slider' ||
            config.type === 'range' ||
            config.type === 'range-slider') && (
            <Typography
              component="span"
              variant="caption"
              sx={{ ml: 1, color: 'text.secondary', fontWeight: 400 }}
            >
              {config.type === 'range' || config.type === 'range-slider'
                ? `[${(value as [number, number])[0]}, ${(value as [number, number])[1]}]`
                : String(value)}
            </Typography>
          )}
      </Typography>
      {!compact &&
        (config.type === 'number' ||
          config.type === 'number-slider' ||
          config.type === 'range' ||
          config.type === 'range-slider') && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 400 }}
          >
            {config.type === 'range' || config.type === 'range-slider'
              ? `[${(value as [number, number])[0]}, ${(value as [number, number])[1]}]`
              : String(value)}
          </Typography>
        )}
    </Box>
  )

  const control = (
    <Box
      sx={{ flex: compact ? 'unset' : 1, maxWidth: compact ? 'unset' : 400 }}
    >
      <ParamControl config={config} value={value} onChange={onChange} />
    </Box>
  )

  return (
    <Box
      sx={{
        py: 0.5,
        px: 1,
        bgcolor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[100]
            : theme.palette.background.paper,
        borderRadius: 1,
        minWidth: compact ? 'fit-content' : 'unset',
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 0 : 2,
        flexDirection: compact ? 'column' : 'row',
      }}
    >
      {compact ? (
        <Stack spacing={0.5} sx={{ width: '100%' }}>
          {label}
          {control}
        </Stack>
      ) : (
        <>
          {label}
          {control}
        </>
      )}
    </Box>
  )
}

export function ParamsView() {
  const creagenEditor = useCreagenEditor()
  const params = creagenEditor.params
  useForceUpdateOnEditorEvent('render')

  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)
  const autoRender = useSettings('params.auto_render')
  const compactLayout = useSettings('params.compact_layout')

  const handleValueChange = (key: ParamKey, newValue: unknown) => {
    creagenEditor.params.setValue(key, newValue)
    forceUpdate()

    if (autoRender) {
      void creagenEditor.render()
    }
  }

  const handleRandomizeAll = () => {
    params.forEach(([config], key) => {
      const randomValue = generateRandomValue(config)
      creagenEditor.params.setValue(key, randomValue)
    })
    forceUpdate()

    if (autoRender) {
      void creagenEditor.render()
    }
  }

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        justifyContent="flex-end"
        sx={{ mb: 1, flexShrink: 0, p: 0.5 }}
      >
        <Tooltip title="Randomize all parameters">
          <IconButton
            onClick={handleRandomizeAll}
            size="small"
            sx={{ p: 0.5 }}
            disabled={params.length === 0}
          >
            <ShuffleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(compactLayout)}
              onChange={(e) =>
                creagenEditor.settings.set(
                  'params.compact_layout',
                  e.target.checked,
                )
              }
              size="small"
            />
          }
          label={
            <Typography variant="caption" color="text.secondary">
              Compact
            </Typography>
          }
          sx={{ mr: 0 }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={autoRender}
              onChange={(e) =>
                creagenEditor.settings.set(
                  'params.auto_render',
                  e.target.checked,
                )
              }
              size="small"
            />
          }
          label={
            <Typography variant="caption" color="text.secondary">
              Auto render
            </Typography>
          }
          sx={{ mr: 0 }}
        />
      </Stack>

      <Box
        sx={{
          display: 'flex',
          flexWrap: compactLayout ? 'wrap' : 'nowrap',
          flexDirection: compactLayout ? 'row' : 'column',
          gap: 1,
          alignContent: 'flex-start',
          overflow: 'auto',
          flex: 1,
          minHeight: 0,
          p: 1,
        }}
      >
        {params.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            No parameters defined
          </Typography>
        ) : (
          [...params.entries()].map(([key, [config, value]], index) => (
            <ParamItem
              key={index}
              paramKey={key}
              config={config}
              value={value}
              compact={Boolean(compactLayout)}
              onChange={(newValue) => handleValueChange(key, newValue)}
            />
          ))
        )}
      </Box>
    </Box>
  )
}
