import { Generator } from '../generator'
import { beta } from '../random'
import { circle, path } from '../svg'

const gen = new Generator({ width: '1000px', height: '1000px' })

const positions = []
for (let r = 0; r < 500; r += 3) {
  // const theta = boxMuller(0.5, Math.PI / 2, () => Math.random())
  const theta = beta(12.5, 12.5) * 2 * Math.PI
  // const theta = Math.random() * 2 * Math.PI
  const x = r * Math.cos(theta)
  const y = r * Math.sin(theta)
  positions.push([500 + x, 500 + y])
  positions.push([500 - x, 500 + y])
  // gen.add(circle(3, x, y))
}

const visited = Array.from(Array(positions.length), () => new Array())
let a = Math.round(Math.random() * positions.length)

const [x, y] = positions[a]!
let p = `M${x} ${y}`

while (true) {
  const [x, y] = positions[a]!
  const d = positions
    .map((p, i) => [(p[0]! - x) ** 2 + (p[1]! - y) ** 2, i])
    .filter(
      ([d, i]) =>
        d !== 0 &&
        visited[i].length < 6 &&
        !visited[i].includes(a) &&
        d < 350 ** 2,
    )
    .sort((a, b) => a[0] > b[0])[0]

  if (typeof d === 'undefined') {
    break
  }

  const i = d[1]!
  const [nx, ny] = positions[i]
  p += ` L${nx} ${ny}`
  visited[i].push(a)
  a = i
}
p += ' Z'
gen.add(path(p))

gen.add(circle(200, 500, 500))
