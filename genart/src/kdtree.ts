import RBush from 'rbush'
import { kdTree } from 'kd-tree-javascript'
function distance(a, b) {
  console.log(a, b)
  return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
}
export class KDTree {
  dataset: [number, number][]
  // tree: KDBush
  tree: RBush

  constructor(dataset: [number, number][]) {
    // constructor(length: number) {
    this.tree = new kdTree(dataset, distance, [0, 1])
    this.dataset = dataset
    // let d = dataset.flat()
    // const buffer = new Float64Array(d)
    // this.tree = new KDBush(length)
    // this.tree = new RBush()
    // this.tree.load(dataset)
  }

  insert(x, y) {
    this.tree.add(x, y)
  }

  finish() {
    this.tree.finish()
  }

  nearest(index: number, count?: number) {
    const [x, y] = this.dataset[index]
    return this.tree.nearest([x, y], count)

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
