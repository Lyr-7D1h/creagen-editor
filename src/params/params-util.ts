import { generateHumanReadableName } from '../vcs/generateHumanReadableName'
import { ParamConfig } from './Params'

export function generateRandomValue(config: ParamConfig): unknown {
  switch (config.type) {
    case 'boolean':
      return Math.random() > 0.5
    case 'number':
    case 'number-slider': {
      const min = config.min ?? 0
      const max = config.max ?? 10000000
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
