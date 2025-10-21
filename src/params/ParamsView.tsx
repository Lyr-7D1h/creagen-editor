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
        <Slider
          value={numValue}
          onChange={(_, newValue) => onChange(newValue)}
          min={min}
          max={max}
          step={step}
          valueLabelDisplay="auto"
          size="small"
          sx={{ minWidth: 120 }}
        />
      )
      break
    }

    case 'text': {
      const strValue = typeof value === 'string' ? value : config.default
      control = <StringInput value={strValue} onChange={onChange} />
      break
    }

    case 'range': {
      const rangeValue = Array.isArray(value) ? value : config.default
      const min = config.min
      const max = config.max
      const step = config.step

      control = (
        <Slider
          value={rangeValue as [number, number]}
          onChange={(_, newValue) => onChange(newValue as [number, number])}
          min={min}
          max={max}
          step={step}
          valueLabelDisplay="auto"
          size="small"
          sx={{ minWidth: 120 }}
        />
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
    case 'number': {
      const min = config.min
      const max = config.max
      const step = config.step
      if (step !== undefined) {
        const steps = Math.floor((max - min) / step)
        return min + Math.floor(Math.random() * (steps + 1)) * step
      }
      return min + Math.random() * (max - min)
    }
    case 'text':
      // For text, just generate a random short string
      return Math.random().toString(36).substring(2, 8)
    case 'range': {
      const min = config.min
      const max = config.max
      const step = config.step
      const steps = Math.floor((max - min) / step)
      const val1 = min + Math.floor(Math.random() * (steps + 1)) * step
      const val2 = min + Math.floor(Math.random() * (steps + 1)) * step
      return val1 <= val2 ? [val1, val2] : [val2, val1]
    }
    case 'seed':
      return generateHumanReadableName()
    case 'radio': {
      const values = Object.values(config.items)
      return values[Math.floor(Math.random() * values.length)]
    }
  }
}

export function ParamsView() {
  const creagenEditor = useCreagenEditor()
  useForceUpdateOnEditorEvent('render')

  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)
  const autoRender = useSettings('params.auto_render')

  const handleValueChange = (key: ParamKey, newValue: unknown) => {
    creagenEditor.params.setValue(key, newValue)
    forceUpdate()

    if (autoRender) {
      void creagenEditor.render()
    }
  }

  const handleRandomizeAll = () => {
    params.forEach(([key, config]) => {
      const randomValue = generateRandomValue(config)
      creagenEditor.params.setValue(key, randomValue)
    })
    forceUpdate()

    if (autoRender) {
      void creagenEditor.render()
    }
  }

  const params = creagenEditor.params.getAll()

  if (params.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No parameters defined
        </Typography>
      </Box>
    )
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
        sx={{ mb: 1, flexShrink: 0, p: 1.5 }}
      >
        <Typography variant="subtitle2">
          Parameters ({params.length})
        </Typography>
        <Tooltip title="Randomize all parameters">
          <IconButton onClick={handleRandomizeAll} size="small" sx={{ p: 0.5 }}>
            <ShuffleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
          sx={{ ml: 'auto', mr: 0 }}
        />
      </Stack>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignContent: 'flex-start',
          overflow: 'auto',
          flex: 1,
          minHeight: 0,
          p: 1,
        }}
      >
        {params.map(([key, config, value], index) => (
          <Box
            key={index}
            sx={{
              py: 0.5,
              px: 1,
              bgcolor: 'action.hover',
              borderRadius: 1,
              minWidth: 'fit-content',
            }}
          >
            <Stack spacing={0.5}>
              {/* Header */}
              <Typography
                variant="caption"
                component="div"
                noWrap
                sx={{ fontWeight: 500 }}
              >
                {key}
                {(config.type === 'number' || config.type === 'range') && (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ ml: 1, color: 'text.secondary', fontWeight: 400 }}
                  >
                    {config.type === 'range'
                      ? `[${(value as [number, number])[0]}, ${(value as [number, number])[1]}]`
                      : String(value)}
                  </Typography>
                )}
              </Typography>

              {/* Control */}
              <ParamControl
                config={config}
                value={value}
                onChange={(newValue) => handleValueChange(key, newValue)}
              />
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
