import React from 'react'
import { useForceUpdateOnEditorEvent } from '../events/useEditorEvents'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Refresh as RefreshIcon } from '@mui/icons-material'
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
  switch (config.type) {
    case 'boolean':
      return (
        <Switch
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          size="small"
        />
      )

    case 'number': {
      const numValue = typeof value === 'number' ? value : config.default
      const min = config.min
      const max = config.max
      const step = config.step ?? 1

      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <Slider
            value={numValue}
            onChange={(_, newValue) => onChange(newValue)}
            min={min}
            max={max}
            step={step}
            valueLabelDisplay="auto"
            size="small"
            sx={{ flex: 1, minWidth: 80 }}
          />
          <TextField
            type="number"
            value={numValue}
            onChange={(e) => onChange(Number(e.target.value))}
            size="small"
            sx={{ width: 70 }}
            inputProps={{ min, max, step }}
          />
        </Stack>
      )
    }

    case 'string': {
      const strValue = typeof value === 'string' ? value : config.default
      return <StringInput value={strValue} onChange={onChange} />
    }

    case 'range': {
      const rangeValue = Array.isArray(value) ? value : config.default
      const min = config.min
      const max = config.max
      const step = config.step

      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <Slider
            value={rangeValue as [number, number]}
            onChange={(_, newValue) => onChange(newValue as [number, number])}
            min={min}
            max={max}
            step={step}
            valueLabelDisplay="auto"
            size="small"
            sx={{ flex: 1, minWidth: 80 }}
          />
          <TextField
            type="number"
            value={rangeValue[0] as number}
            onChange={(e) => onChange([Number(e.target.value), rangeValue[1]])}
            size="small"
            sx={{ width: 60 }}
            inputProps={{ min, max, step }}
          />
          <TextField
            type="number"
            value={rangeValue[1] as number}
            onChange={(e) => onChange([rangeValue[0], Number(e.target.value)])}
            size="small"
            sx={{ width: 60 }}
            inputProps={{ min, max, step }}
          />
        </Stack>
      )
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
      return <SeedInput value={seedValue} onChange={onChange} />
    }

    case 'radio': {
      const items = config.items
      const radioValue =
        typeof value === 'string' ? value : (config.default ?? '')

      return (
        <RadioGroup
          value={radioValue}
          onChange={(e) => {
            const selectedKey = e.target.value
            onChange(items[selectedKey])
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${config.columns ?? 2}, 1fr)`,
              gap: 0.5,
            }}
          >
            {Object.keys(items).map((key) => (
              <FormControlLabel
                key={key}
                value={key}
                control={<Radio size="small" />}
                label={key}
                sx={{ mr: 0 }}
              />
            ))}
          </Box>
        </RadioGroup>
      )
    }

    case 'function':
      return (
        <Typography variant="caption" color="text.secondary" fontStyle="italic">
          Function (not editable)
        </Typography>
      )

    default:
      return (
        <Typography variant="body2" color="text.secondary">
          Unknown parameter type
        </Typography>
      )
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
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2">
          Parameters ({params.length})
        </Typography>
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
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 1,
          rowGap: 1.5,
        }}
      >
        {params.map(([key, config, value], index) => (
          <Box key={index}>
            <Stack spacing={0.5}>
              {/* Header */}
              <Typography
                variant="caption"
                component="div"
                noWrap
                sx={{ fontWeight: 500 }}
              >
                {config.title ?? config.type}
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
