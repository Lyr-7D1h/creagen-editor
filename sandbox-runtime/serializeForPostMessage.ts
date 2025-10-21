/**
 * Helper function to safely serialize data for postMessage
 * Handles types that cannot be sent via the structured clone algorithm
 */
export function serializeForPostMessage(args: unknown[]): unknown[] {
  return args.map((arg) => {
    // Handle primitive types that are already serializable
    if (
      arg === null ||
      typeof arg === 'string' ||
      typeof arg === 'number' ||
      typeof arg === 'boolean'
    ) {
      return arg
    }

    // Handle undefined
    if (arg === undefined) {
      return '[undefined]'
    }

    // Handle functions
    if (typeof arg === 'function') {
      return `[Function: ${arg.name || 'anonymous'}]`
    }

    // Handle symbols
    if (typeof arg === 'symbol') {
      return `[Symbol: ${arg.toString()}]`
    }

    // Handle errors
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      }
    }

    // Handle arrays
    if (Array.isArray(arg)) {
      return arg.map((item) => serializeForPostMessage([item])[0])
    }

    // Handle objects (including plain objects, dates, etc.)
    if (typeof arg === 'object') {
      try {
        // Try to use structured clone algorithm (will throw if not cloneable)
        structuredClone(arg)
        return arg
      } catch {
        // If structured clone fails, manually serialize
        try {
          const serialized: Record<string, unknown> = {}
          for (const key in arg) {
            if (Object.prototype.hasOwnProperty.call(arg, key)) {
              const value = (arg as Record<string, unknown>)[key]
              serialized[key] = serializeForPostMessage([value])[0]
            }
          }
          return serialized
        } catch {
          // If all else fails, try JSON.stringify or return type info
          try {
            return JSON.stringify(arg)
          } catch {
            return `[Object: ${Object.prototype.toString.call(arg)}]`
          }
        }
      }
    }

    // Fallback for any other types
    try {
      return JSON.stringify(arg)
    } catch {
      return `[${typeof arg}]`
    }
  })
}
