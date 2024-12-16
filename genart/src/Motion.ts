/** A motion profile */
export class Motion {
  velocity: number
  velocityMin: number
  velocityMax: number

  acceleration: number
  accelerationMin: number
  accelerationMax: number

  jerk: number
  jerkMin: number
  jerkMax: number

  snap: number
  snapMax: number

  constructor(
    public value: number,
    public target: number = value,
  ) {}

  setTarget(target: number) {
    this.target = target
  }

  /**
   * Update the value according the the motion plan
   * @param increase (-1 to 1) Percentage to increase the value in within bounds
   * @param dt difference in time
   */
  update(t: number) {}

  getPosition(t: number) {}
}
