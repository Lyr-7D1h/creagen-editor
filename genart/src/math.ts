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

export function gcd(a: number, b: number) {
  if (b === 0) return a
  return gcd(b, a % b)
}

export function mod(n: number, m: number) {
  return ((n % m) + m) % m
}

export function roundToDec(n: number, dec?: number) {
  if (
    typeof window.genart.config.precision === 'undefined' &&
    typeof dec === 'undefined'
  ) {
    return n
  }
  return parseFloat(n.toFixed(dec ?? window.genart.config.precision))
}
