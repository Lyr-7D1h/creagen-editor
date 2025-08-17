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

export function timeAgoString(date: Date) {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  let interval = seconds / 31536000 // seconds in a year
  if (interval > 1) {
    const years = Math.floor(interval)
    return years === 1 ? 'a year ago' : `${years} years ago`
  }

  interval = seconds / 2592000 // seconds in a month
  if (interval > 1) {
    const months = Math.floor(interval)
    return months === 1 ? 'a month ago' : `${months} months ago`
  }

  interval = seconds / 86400 // seconds in a day
  if (interval > 1) {
    const days = Math.floor(interval)
    return days === 1 ? 'a day ago' : `${days} days ago`
  }

  interval = seconds / 3600 // seconds in an hour
  if (interval > 1) {
    const hours = Math.floor(interval)
    return hours === 1 ? 'an hour ago' : `${hours} hours ago`
  }

  interval = seconds / 60 // seconds in a minute
  if (interval > 1) {
    const minutes = Math.floor(interval)
    return minutes === 1 ? 'a minute ago' : `${minutes} minutes ago`
  }

  if (seconds < 10) {
    return 'just now'
  }

  return `${Math.floor(seconds)} seconds ago`
}
export function dateString(date: Date) {
  const year = date.getFullYear()
  const month = date.toLocaleString('default', { month: 'long' })
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${month} ${day}, ${year} at ${hours}:${minutes}`
}

export function getDocumentWidth() {
  return Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth,
    document.body.offsetWidth,
    document.documentElement.offsetWidth,
    document.documentElement.clientWidth,
  )
}

export function getDocumentHeight() {
  return Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.documentElement.clientHeight,
  )
}
