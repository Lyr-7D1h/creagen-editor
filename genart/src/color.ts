import { type Indexable } from './util'

function hex(x: number) {
  if (x > 255 || x < 0) throw Error('rgb value must be between 0 and 255')
  const hex = Math.round(x).toString(16)
  return hex.length === 1 ? '0' + hex : hex
}
/** takes first three values of any array like and converts it to hex color code */
export function rgbtohex(list: Indexable<number>) {
  if (list.length < 3) throw Error('list must be of length 3')
  return '#' + hex(list[0]!) + hex(list[1]!) + hex(list[2]!)
}
