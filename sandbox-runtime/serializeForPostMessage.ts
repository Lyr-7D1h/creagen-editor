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
      // Return as-is; postMessage's structured clone algorithm handles plain objects
      // (Date, Map, Set, TypedArray, etc.) without any extra allocation.
      // Non-cloneable objects (DOM nodes, canvas contexts, etc.) cause a DataCloneError
      // at the send site — the caller is responsible for catching that and falling back.
      return arg
    }

    // Fallback for any other types
    try {
      return JSON.stringify(arg)
    } catch {
      return `[${typeof arg}]`
    }
  })
}
