import { FixedArray, Vector } from '../Vector'
// import skmeans from 'skmeans'
import { kmeans } from 'ml-kmeans'

export class KMeans<N extends number, K extends number> {
  private _clusters: number[]
  private _centroids: FixedArray<number, N>[]

  static create<N extends number>(vectors: Vector<N>[], k: number) {
    return new KMeans(vectors, k)
  }

  constructor(vectors: Vector<N>[], k: K) {
    let { clusters, centroids } = kmeans(vectors, k, {})
    this._clusters = clusters
    this._centroids = centroids as FixedArray<number, N>[]
  }

  clusters() {
    return this._clusters
  }

  centroids() {
    return this._centroids
  }
}
