export class ResourceMonitor {
  private lastFrameTime: DOMHighResTimeStamp | null = null
  private isListening = false
  private animationFrameId: number | null = null
  private frameSamples: number[] = []
  private currentIndex = 0
  private sampleCount = 0
  private runningSum = 0
  private framesSinceRecalc = 0
  private readonly RECALC_INTERVAL = 100 // Recalculate every 100 frames

  constructor(private readonly frameSamplingRate = 60) {}

  listen() {
    if (this.isListening) return
    this.isListening = true
    this.lastFrameTime = null
    this.frameSamples = new Array(this.frameSamplingRate).fill(0)
    this.currentIndex = 0
    this.sampleCount = 0
    this.runningSum = 0
    this.framesSinceRecalc = 0

    const listen = (currentTime: DOMHighResTimeStamp) => {
      if (!this.isListening) return

      // Request the next animation frame
      this.animationFrameId = window.requestAnimationFrame(listen)
      if (this.lastFrameTime === null) {
        this.lastFrameTime = currentTime
        return
      }

      // Calculate the time difference since the last frame
      const deltaTime = currentTime - this.lastFrameTime
      this.lastFrameTime = currentTime

      // Use circular buffer with running sum - O(1) operation
      const oldValue = this.frameSamples[this.currentIndex] || 0
      this.frameSamples[this.currentIndex] = deltaTime
      this.runningSum = this.runningSum - oldValue + deltaTime
      this.currentIndex = (this.currentIndex + 1) % this.frameSamplingRate
      this.sampleCount = Math.min(this.sampleCount + 1, this.frameSamplingRate)

      // Periodically recalculate to prevent floating-point drift
      this.framesSinceRecalc++
      if (this.framesSinceRecalc >= this.RECALC_INTERVAL) {
        this.framesSinceRecalc = 0
        this.runningSum = 0
        for (let i = 0; i < this.sampleCount; i++) {
          this.runningSum += this.frameSamples[i] || 0
        }
      }
    }
    this.animationFrameId = window.requestAnimationFrame(listen)
  }

  stopListening() {
    this.isListening = false
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * Get the current average frame time from samples
   */
  getAverageFrameTime(): number {
    if (this.sampleCount === 0) return 0
    return this.runningSum / this.sampleCount
  }

  /**
   * Get the current FPS based on average frame time
   */
  getAverageFPS(): number {
    const avgFrameTime = this.getAverageFrameTime()
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0
  }

  /**
   * Get statistics about frame performance
   */
  getStats() {
    const avgFrameTime = this.getAverageFrameTime()

    let minFrameTime = 0
    let maxFrameTime = 0

    if (this.sampleCount > 0) {
      minFrameTime = this.frameSamples[0] || 0
      maxFrameTime = this.frameSamples[0] || 0

      for (let i = 1; i < this.sampleCount; i++) {
        const sample = this.frameSamples[i] || 0
        if (sample < minFrameTime) minFrameTime = sample
        if (sample > maxFrameTime) maxFrameTime = sample
      }
    }

    return {
      averageFrameTime: avgFrameTime,
      averageFPS: this.getAverageFPS(),
      sampleCount: this.sampleCount,
      minFrameTime,
      maxFrameTime,
    }
  }
}
