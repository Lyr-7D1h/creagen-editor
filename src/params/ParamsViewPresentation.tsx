import {
  Refresh as RefreshIcon,
  Shuffle as ShuffleIcon,
  RestartAlt as RestartAltIcon,
} from '@mui/icons-material'
import {
  TextField,
  Stack,
  Tooltip,
  IconButton,
  Slider,
  Switch,
  Box,
  Typography,
  Select,
  SelectChangeEvent,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import React from 'react'
import { generateHumanReadableName } from '../vcs/generateHumanReadableName'
import { ParamConfig, Params } from './Params'

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

function IntegerInput({
  config,
  value,
  onChange,
}: {
  config: ParamConfig & { type: 'integer' }
  value: number
  onChange: (value: number) => void
}) {
  const [localValue, setLocalValue] = React.useState(String(value))
  const [isValid, setIsValid] = React.useState(true)

  React.useEffect(() => {
    setLocalValue(String(value))
    setIsValid(true)
  }, [value])

  const min = config.min
  const max = config.max

  // Show slider if min and max are defined
  const showSlider =
    typeof config.min !== 'undefined' && typeof config.max !== 'undefined'

  const handleChange = (inputValue: string) => {
    setLocalValue(inputValue)
    const val = parseInt(inputValue, 10)
    const valid = !isNaN(val) && Params.isValidValue(config, val)
    setIsValid(valid)
  }

  const commit = () => {
    const val = parseInt(localValue, 10)
    const valid = !isNaN(val) && Params.isValidValue(config, val)
    setIsValid(valid)
    if (valid) {
      onChange(val)
    } else {
      setLocalValue(String(value))
    }
  }

  const textField = (
    <TextField
      type="number"
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
        }
      }}
      slotProps={{
        htmlInput: {
          min,
          max,
          step: 1,
        },
      }}
      size="small"
      fullWidth
      error={!isValid}
      helperText={
        !isValid
          ? `Must be an integer between ${min ?? '-∞'} and ${max ?? '∞'}`
          : undefined
      }
    />
  )

  if (!showSlider) {
    return textField
  }

  return (
    <Stack direction="column" spacing={0.5} sx={{ width: '100%' }}>
      {textField}
      <Slider
        value={value}
        onChangeCommitted={(_, newValue) => {
          if (
            typeof newValue === 'number' &&
            Params.isValidValue(config, newValue)
          ) {
            onChange(newValue)
          }
        }}
        min={min}
        max={max}
        step={1}
        valueLabelDisplay="auto"
        size="small"
      />
    </Stack>
  )
}

function FloatInput({
  config,
  value,
  onChange,
}: {
  config: ParamConfig & { type: 'float' }
  value: number
  onChange: (value: number) => void
}) {
  const [localValue, setLocalValue] = React.useState(String(value))
  const [isValid, setIsValid] = React.useState(true)

  React.useEffect(() => {
    setLocalValue(String(value))
    setIsValid(true)
  }, [value])

  const min = config.min
  const max = config.max
  const step = config.step

  // Show slider if min and max are defined (step is always defined after transform)
  const showSlider =
    typeof config.min !== 'undefined' && typeof config.max !== 'undefined'

  const handleChange = (inputValue: string) => {
    setLocalValue(inputValue)
    const val = parseFloat(inputValue)
    const valid = !isNaN(val) && Params.isValidValue(config, val)
    setIsValid(valid)
  }

  const commit = () => {
    const val = parseFloat(localValue)
    const valid = !isNaN(val) && Params.isValidValue(config, val)
    setIsValid(valid)
    if (valid) {
      onChange(val)
    } else {
      setLocalValue(String(value))
    }
  }

  const textField = (
    <TextField
      type="number"
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
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
      error={!isValid}
      helperText={
        !isValid
          ? `Must be a number between ${min ?? '-∞'} and ${max ?? '∞'}`
          : undefined
      }
    />
  )

  if (!showSlider) {
    return textField
  }

  return (
    <Stack direction="column" spacing={0.5} sx={{ width: '100%' }}>
      {textField}
      <Slider
        value={value}
        onChangeCommitted={(_, newValue) => {
          if (
            typeof newValue === 'number' &&
            Params.isValidValue(config, newValue)
          ) {
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
}

function RangeInput({
  config,
  value,
  onChange,
}: {
  config: ParamConfig & { type: 'range' }
  value: [number, number]
  onChange: (value: [number, number]) => void
}) {
  const [localMinValue, setLocalMinValue] = React.useState(String(value[0]))
  const [localMaxValue, setLocalMaxValue] = React.useState(String(value[1]))
  const [isMinValid, setIsMinValid] = React.useState(true)
  const [isMaxValid, setIsMaxValid] = React.useState(true)

  React.useEffect(() => {
    setLocalMinValue(String(value[0]))
    setLocalMaxValue(String(value[1]))
    setIsMinValid(true)
    setIsMaxValid(true)
  }, [value])

  const min = config.min
  const max = config.max
  const step = config.step

  const handleMinChange = (inputValue: string) => {
    setLocalMinValue(inputValue)
    const val = parseFloat(inputValue)
    if (!isNaN(val)) {
      const newMin = Math.min(val, value[1])
      const newValue: [number, number] = [newMin, value[1]]
      const valid = Params.isValidValue(config, newValue)
      setIsMinValid(valid)
      if (valid) {
        onChange(newValue)
      }
    } else {
      setIsMinValid(false)
    }
  }

  const handleMaxChange = (inputValue: string) => {
    setLocalMaxValue(inputValue)
    const val = parseFloat(inputValue)
    if (!isNaN(val)) {
      const newMax = Math.max(val, value[0])
      const newValue: [number, number] = [value[0], newMax]
      const valid = Params.isValidValue(config, newValue)
      setIsMaxValid(valid)
      if (valid) {
        onChange(newValue)
      }
    } else {
      setIsMaxValid(false)
    }
  }

  return (
    <Stack direction="row" spacing={0.5}>
      <TextField
        type="number"
        value={localMinValue}
        onChange={(e) => handleMinChange(e.target.value)}
        slotProps={{
          htmlInput: {
            min,
            max: value[1],
            step,
          },
        }}
        size="small"
        fullWidth
        error={!isMinValid}
        helperText={!isMinValid ? `Invalid` : undefined}
      />
      <TextField
        type="number"
        value={localMaxValue}
        onChange={(e) => handleMaxChange(e.target.value)}
        slotProps={{
          htmlInput: {
            min: value[0],
            max,
            step,
          },
        }}
        size="small"
        fullWidth
        error={!isMaxValid}
        helperText={!isMaxValid ? `Invalid` : undefined}
      />
    </Stack>
  )
}

function RangeSliderInput({
  config,
  value,
  onChange,
}: {
  config: ParamConfig & { type: 'range-slider' }
  value: [number, number]
  onChange: (value: [number, number]) => void
}) {
  const [localMinValue, setLocalMinValue] = React.useState(String(value[0]))
  const [localMaxValue, setLocalMaxValue] = React.useState(String(value[1]))
  const [isMinValid, setIsMinValid] = React.useState(true)
  const [isMaxValid, setIsMaxValid] = React.useState(true)

  React.useEffect(() => {
    setLocalMinValue(String(value[0]))
    setLocalMaxValue(String(value[1]))
    setIsMinValid(true)
    setIsMaxValid(true)
  }, [value])

  const min = config.min
  const max = config.max
  const step = config.step

  const handleMinChange = (inputValue: string) => {
    setLocalMinValue(inputValue)
    const val = parseFloat(inputValue)
    if (!isNaN(val)) {
      const newMin = Math.min(val, value[1])
      const newValue: [number, number] = [newMin, value[1]]
      const valid = Params.isValidValue(config, newValue)
      setIsMinValid(valid)
      if (valid) {
        onChange(newValue)
      }
    } else {
      setIsMinValid(false)
    }
  }

  const handleMaxChange = (inputValue: string) => {
    setLocalMaxValue(inputValue)
    const val = parseFloat(inputValue)
    if (!isNaN(val)) {
      const newMax = Math.max(val, value[0])
      const newValue: [number, number] = [value[0], newMax]
      const valid = Params.isValidValue(config, newValue)
      setIsMaxValid(valid)
      if (valid) {
        onChange(newValue)
      }
    } else {
      setIsMaxValid(false)
    }
  }

  return (
    <Stack direction="column" spacing={0.5} sx={{ width: '100%' }}>
      <Stack direction="row" spacing={0.5}>
        <TextField
          type="number"
          value={localMinValue}
          onChange={(e) => handleMinChange(e.target.value)}
          slotProps={{
            htmlInput: {
              min,
              max: value[1],
              step,
            },
          }}
          size="small"
          fullWidth
          error={!isMinValid}
          helperText={!isMinValid ? `Invalid` : undefined}
        />
        <TextField
          type="number"
          value={localMaxValue}
          onChange={(e) => handleMaxChange(e.target.value)}
          slotProps={{
            htmlInput: {
              min: value[0],
              max,
              step,
            },
          }}
          size="small"
          fullWidth
          error={!isMaxValid}
          helperText={!isMaxValid ? `Invalid` : undefined}
        />
      </Stack>
      <Slider
        value={value}
        onChangeCommitted={(_, newValue) => {
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

    case 'integer': {
      const numValue = typeof value === 'number' ? value : config.default
      control = (
        <IntegerInput
          config={config}
          value={numValue}
          onChange={onChange as (value: number) => void}
        />
      )
      break
    }

    case 'float': {
      const numValue = typeof value === 'number' ? value : config.default
      control = (
        <FloatInput
          config={config}
          value={numValue}
          onChange={onChange as (value: number) => void}
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
      const rangeValue = (Array.isArray(value) ? value : config.default) as [
        number,
        number,
      ]
      control = (
        <RangeInput
          config={config}
          value={rangeValue}
          onChange={onChange as (value: [number, number]) => void}
        />
      )
      break
    }

    case 'range-slider': {
      const rangeValue = (Array.isArray(value) ? value : config.default) as [
        number,
        number,
      ]
      control = (
        <RangeSliderInput
          config={config}
          value={rangeValue}
          onChange={onChange as (value: [number, number]) => void}
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
          (config.type === 'integer' ||
            config.type === 'float' ||
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
        (config.type === 'integer' ||
          config.type === 'float' ||
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

export function ParamsViewPresentation({
  configs,
  values,
  compactLayout,
  autoRender,
  regenIntervalMs,
  onValueChange,
  onRandomizeAll,
  onResetToDefaults,
  onRegenIntervalChange,
  onCompactLayoutChange,
  onAutoRenderChange,
}: {
  configs: Map<string, ParamConfig>
  values: Map<string, unknown>
  compactLayout: boolean
  autoRender?: boolean
  regenIntervalMs: number
  onValueChange: (key: string, newValue: unknown) => void
  onRandomizeAll: () => void
  onResetToDefaults: () => void
  onRegenIntervalChange: (ms: number) => void
  onCompactLayoutChange: (compact: boolean) => void
  onAutoRenderChange?: (autoRender: boolean) => void
}) {
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
        sx={{ flexShrink: 0, pr: 0.5 }}
      >
        <Tooltip title="Reset all to defaults">
          <span>
            <IconButton
              onClick={onResetToDefaults}
              size="small"
              sx={{ p: 0.5 }}
              disabled={configs.size === 0}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Randomize all parameters">
          <span>
            <IconButton
              onClick={onRandomizeAll}
              size="small"
              sx={{ p: 0.5 }}
              disabled={configs.size === 0}
              color={regenIntervalMs > 0 ? 'primary' : 'default'}
            >
              <ShuffleIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Select
          size="small"
          value={String(regenIntervalMs)}
          onChange={(e: SelectChangeEvent<string>) =>
            onRegenIntervalChange(Number(e.target.value))
          }
          disabled={configs.size === 0}
          sx={{ ml: 0.5, width: 88 }}
        >
          <MenuItem value={'0'}>Off</MenuItem>
          <MenuItem value={'1000'}>1s</MenuItem>
          <MenuItem value={'2000'}>2s</MenuItem>
          <MenuItem value={'3000'}>3s</MenuItem>
          <MenuItem value={'5000'}>5s</MenuItem>
          <MenuItem value={'8000'}>8s</MenuItem>
          <MenuItem value={'13000'}>13s</MenuItem>
        </Select>
        <FormControlLabel
          control={
            <Checkbox
              checked={compactLayout}
              onChange={(e) => onCompactLayoutChange(e.target.checked)}
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
        {autoRender != null && onAutoRenderChange != null && (
          <FormControlLabel
            control={
              <Checkbox
                checked={autoRender}
                onChange={(e) => onAutoRenderChange(e.target.checked)}
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
        )}
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
        {configs.size === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            No parameters defined
          </Typography>
        ) : (
          [...configs.keys()].map((key, index) => (
            <ParamItem
              key={index}
              paramKey={key}
              config={configs.get(key)!}
              value={values.get(key)}
              compact={compactLayout}
              onChange={(newValue) => onValueChange(key, newValue)}
            />
          ))
        )}
      </Box>
    </Box>
  )
}
