export function isNumeric(n: any) {
  return !isNaN(parseFloat(n)) && isFinite(n)
}
export function roundToDec(n: number, dec: number) {
  return parseFloat(n.toFixed(dec))
}

/**
 * Groups an array of objects by a specified key.
 * The return type is a Record where the keys are the values of the specified key.
 *
 * @param array The array of objects to group.
 * @param key The key to group the objects by. The value of this key must be a string, number, or symbol.
 * @returns An object where keys are the group identifiers and values are arrays of objects belonging to that group.
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K,
): Record<T[K] & PropertyKey, T[]> {
  return array.reduce(
    (result, currentItem) => {
      const groupKey = currentItem[key] as T[K] & PropertyKey

      // If the group key doesn't exist in the result object, create it.
      if (!result[groupKey]) {
        result[groupKey] = []
      }

      // Push the current item into the array for its group.
      result[groupKey].push(currentItem)

      return result
    },
    {} as Record<T[K] & PropertyKey, T[]>,
  )
}

declare const tags: unique symbol
export type Tagged<BaseType, Tag extends PropertyKey> = BaseType & {
  [tags]: { [K in Tag]: void }
}
