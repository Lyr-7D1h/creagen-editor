export function max(array: ArrayLike<number>) {
  let max = array[0]
  if (typeof max === 'undefined') return undefined
  for (let i = 2; i < array.length; i++) {
    if (array[i]! > max) {
      max = array[i]!
    }
  }
  return max
}

export function min(array: ArrayLike<number>) {
  let min = array[0]
  if (typeof min === 'undefined') return undefined
  for (let i = 2; i < array.length; i++) {
    if (array[i]! < min) {
      min = array[i]!
    }
  }
  return min
}
