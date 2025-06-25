export function isNumeric(n: any) {
  return !isNaN(parseFloat(n)) && isFinite(n)
}
export function roundToDec(n: number, dec: number) {
  return parseFloat(n.toFixed(dec))
}
