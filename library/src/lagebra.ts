export function vec2(x: number, y: number) {
  return new Vector<2>(x, y)
}

class Vector<N> {
  private vec: number[]

  constructor(...args: number[]) {
    this.vec = args
  }

  sub(vec: Vector<N>) {
    for (const i of vec.vec) {
      this.vec[i] -= vec.vec[i]!
    }
  }
}
