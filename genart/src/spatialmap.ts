import { vec, Vector } from './vec'

// TEST SCRIPT
// import { SpatialMap, svg, vec } from 'genart'

// const width = 1000
// const height = 1000
// const spacing = 50
// const range = 100
// const s = svg({ width: width, height })
// s.grid(spacing)

// const positions = [
//   vec(30, 30),
//   vec(40, 40),
//   vec(50, 975),
//   // vec(970, 970), vec(100, 200), vec(150, 150), vec(300, 400), vec(500, 600)
// ]
// const map = new SpatialMap(width, height, spacing, positions)

// console.log([...map.nearestNeighbors(0, range)])
// for (const p of positions) {
//   s.rect(range * 2, range * 2, { x: p.x - range, y: p.y - range, fillOpacity: '0.2' })
//   s.circle(2, p.x, p.y)
// }

// load(s)

/**
 * Spatial map that uses hash mapping for efficiently finding nearest neighbors
 * Inspired by https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/11-hashing.html#L293
 */
export class SpatialMap {
  private wrap: boolean

  private cellStart: Int32Array
  private cellEntries: Int32Array
  private queryIds: Int32Array
  private querySize: number
  private spacing: number

  private positionsSize: number
  private positions: Vector<2>[]

  private width: number
  private height: number

  private rowLength: number
  private columnLength: number

  constructor(
    width: number,
    height: number,
    spacing: number,
    positions: Vector<2>[],
    opts?: { wrap: boolean },
  ) {
    this.wrap = typeof opts?.wrap === 'undefined' ? false : opts.wrap
    this.width = width
    this.height = height
    this.spacing = spacing

    this.rowLength = Math.ceil(width / this.spacing)
    this.columnLength = Math.ceil(height / this.spacing)

    const size = this.rowLength * this.columnLength

    this.cellStart = new Int32Array(size)
    this.cellEntries = new Int32Array()
    this.queryIds = new Int32Array()
    this.querySize = 0
    this.positionsSize = 0
    this.positions = positions
    this.update()
  }

  /** Update the spatial map with changed positions */
  update() {
    // create new entries array with different size
    if (this.positions.length > this.positionsSize) {
      this.cellEntries = new Int32Array(this.positions.length)
      this.queryIds = new Int32Array(this.positions.length)
    }
    this.positionsSize = this.positions.length
    this.cellStart.fill(0)
    this.cellEntries.fill(0)

    for (const p of this.positions) {
      const i = this.getIndex(p)

      this.cellStart[i] += 1
    }

    let start = 0
    for (let i = 0; i < this.cellStart.length; i++) {
      start += this.cellStart[i]!
      this.cellStart[i] = start
    }

    for (let ci = 0; ci < this.positions.length; ci++) {
      const i = this.getIndex(this.positions[ci]!)
      this.cellStart[i]--
      this.cellEntries[this.cellStart[i]!] = ci
    }
  }

  /** get the index of a tile from normal cartesian coordiantes */
  getIndex({ x, y }: Vector<2>) {
    if (this.wrap) {
      // wrap coords
      if (x < 0) x = this.width + x
      if (x > this.width - 1) x = x % this.width
      if (y < 0) y = this.height + y
      if (y > this.height - 1) {
        y = y % this.height
      }
    } else {
      if (x < 0) x = 0
      if (x > this.width - 1) x = this.width - 1
      if (y < 0) y = 0
      if (y > this.height - 1) {
        y = this.height - 1
      }
    }
    return (
      Math.floor(x / this.spacing) +
      Math.floor(y / this.spacing) * this.rowLength
    )
  }

  /** get the index of a tile given row and column wrapping if it is outside of range */
  get(i: number, j: number) {
    if (this.wrap) {
      // wrap coords
      if (i < 0) i = this.rowLength + i
      if (i >= this.rowLength) i = i % this.rowLength
      if (j < 0) j = this.columnLength + j
      if (j >= this.columnLength) {
        j = j % this.columnLength
      }
    } else {
      if (i < 0) i = 0
      if (i >= this.rowLength) i = this.rowLength
      if (j < 0) j = 0
      if (j >= this.columnLength) {
        j = this.columnLength
      }
    }
    return i + j * this.rowLength
  }

  /** get top left corner of square used */
  coordsFromIndex(index: number): [number, number] {
    return [
      (index % this.rowLength) * this.spacing,
      Math.floor(index / this.rowLength) * this.spacing,
    ]
  }

  /**
   * Strictly all nearest neighbors within a distance
   * returns an iterator with [index of position, direction, distance^2]
   * */
  nearestNeighbors(
    i: number,
    distance: number,
  ): Iterator<[number, Vector<2>, number]> {
    const positions = this.positions
    const p = this.positions[i]!

    // can at maximum be in the top right corner which is (distance + start of block) * 2*sqrt(2) (~2.82)
    const distanceSquared = distance ** 2
    const maxDistance = ((distance + this.spacing) * 2.83) ** 2

    const neigbors = this.nearestNeighborsFromGrid(i, distance)

    const w = this.width
    const h = this.height
    return {
      ids: neigbors.ids,
      size: neigbors.size,
      [Symbol.iterator]() {
        let i = -1

        const next: any = () => {
          i++
          if (i >= this.size) {
            return {
              value: undefined as unknown as [number, Vector<2>, number],
              done: true,
            }
          }
          const ni = this.ids[i]!
          const cn = positions[ni]!
          const pn = cn

          let dir = pn.clone().sub(p)
          // update direction of attraction if direction to neighbor is wrapped around in space
          if (this.wrap && dir.mag2() > maxDistance) {
            const qc = quadrant(w, h, p)
            const qn = quadrant(w, h, cn)
            // correct neighbor position to mirror the location
            dir = pn
              .clone()
              .add(getWrapCorrection(w, h, qc, qn))
              .sub(p)
          }

          const dirMag2 = dir.mag2()

          // if distance is bigger than range skip
          if (dirMag2 > distanceSquared) {
            return next()
          }

          return {
            value: [this.ids[i]!, dir, dirMag2],
            done: false,
          }
        }

        return {
          next,
        }
      },
    }
  }

  /**
   * all nearest neighbor within the spacing of the grid (might be outside distance),
   *
   * returns an iterator with all the ids
   * */
  nearestNeighborsFromGrid(i: number, distance: number): Iterator<number> {
    const { x, y } = this.positions[i]!
    this.querySize = 0

    let x0 = Math.floor((x - distance) / this.spacing)
    let y0 = Math.floor((y - distance) / this.spacing)

    let x1 = Math.floor((x + distance) / this.spacing)
    let y1 = Math.floor((y + distance) / this.spacing)

    if (!this.wrap) {
      if (x0 < 0) x0 = 0
      if (y0 < 0) y0 = 0
      if (x1 > this.rowLength) x0 = this.rowLength
      if (y1 > this.columnLength) y1 = this.columnLength
    }

    for (let yi = y0; yi <= y1; yi++) {
      for (let xi = x0; xi <= x1; xi++) {
        const index = this.get(xi, yi)

        for (
          let j = this.cellStart[index]!;
          j < this.cellStart[index + 1]!;
          j++
        ) {
          const ci = this.cellEntries[j]!
          // // skip current cell
          if (ci === i) continue
          this.queryIds[this.querySize] = ci
          this.querySize++
        }
      }
    }

    return {
      ids: this.queryIds,
      size: this.querySize,
      [Symbol.iterator]() {
        let i = -1
        return {
          next: () => {
            i++
            if (i >= this.size) {
              return {
                value: 0,
                done: true,
              }
            }
            return {
              value: this.ids[i]!,
              done: false,
            }
          },
        }
      },
    }
  }
}

interface Iterator<V> {
  ids: Int32Array
  size: number
  [Symbol.iterator]: () => {
    next: () => {
      value: V
      done: boolean
    }
  }
}

function getWrapCorrection(w: number, h: number, qc: number, qn: number) {
  switch (qc) {
    case 0:
      switch (qn) {
        case 1:
          return vec(-w, 0)
        case 2:
          return vec(0, -h)
        case 3:
          return vec(-w, -h)
      }
      throw Error(
        "neighbor can't be in the same quadrant if direction is above distance check",
      )
    case 1:
      switch (qn) {
        case 0:
          return vec(w, 0)
        case 2:
          return vec(w, -h)
        case 3:
          return vec(0, -h)
      }
      throw Error(
        "neighbor can't be in the same quadrant if direction is above distance check",
      )
    case 2:
      switch (qn) {
        case 0:
          return vec(0, h)
        case 1:
          return vec(-w, h)
        case 3:
          return vec(-w, 0)
      }
      throw Error(
        "neighbor can't be in the same quadrant if direction is above distance check",
      )
    case 3:
      switch (qn) {
        case 0:
          return vec(w, h)
        case 1:
          return vec(0, h)
        case 2:
          return vec(w, 0)
      }
      throw Error(
        "neighbor can't be in the same quadrant if direction is above distance check",
      )
  }
  throw Error(
    "neighbor can't be in the same quadrant if direction is above distance check",
  )
}

/** get which quadrant a coord is returns 0 to 3 */
function quadrant(width: number, height: number, p: Vector<2>) {
  const { x, y } = p
  let q = 0
  if (x > width / 2) {
    q += 1
  }
  if (y > height / 2) {
    q += 2
  }

  return q
}
