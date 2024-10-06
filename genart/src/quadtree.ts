import { quadtree } from 'd3-quadtree'
export class QuadTree {
  points: [number, number][]
  tree: any

  constructor(points: [number, number][]) {
    this.points = points
    this.tree = quadtree(points)
  }

  nearest(index: number, radius?: number) {
    const [x, y] = this.points[index]
    this.tree.search(x, y, radius)
  }
}
