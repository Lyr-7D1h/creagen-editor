// import RBush from 'rbush'
// import { kdTree } from 'kd-tree-javascript'
import KdBush from 'kdbush'
import { Vector } from './Vector'

// function distance(a, b) {
//   return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
// }
export class KDTree {
  // tree: KDBush
  // tree: RBush
  tree: KdBush

  constructor(length: number)
  constructor(dataset: Vector<2>[])
  constructor(x: number | Vector<2>[]) {
    if (typeof x === 'number') {
      this.tree = new KdBush(x)
      this.tree.finish()
      return
    }
    this.tree = new KdBush(x.length)
    for (const p of x) {
      this.tree.add(p.x, p.y)
    }
    this.tree.finish()

    // let d = dataset.flat()
    // const buffer = new Float64Array(d)
    // this.tree = new KDBush(length)
    // this.tree = new RBush()
    // this.tree.load(dataset)
  }

  insert(point: Vector<2>) {
    this.tree.add(point.x, point.y)
  }

  finish() {
    this.tree.finish()
  }

  nearest(point: Vector<2>, maxDistance?: number) {
    return this.tree.within(point.x, point.y, maxDistance)
    // const [x, y] = this.dataset[index]
    // return this.tree.nearest([x, y], count)
    // return this.tree.nearest(point, count, maxDistance)

    // const {x,y} = this.dataset[index]

    // const [x, y] = this.dataset[index]
    // return this.tree.range(
    //   x - maxDistance,
    //   y - maxDistance,
    //   x + maxDistance,
    //   y + maxDistance,
    // )
  }
}
