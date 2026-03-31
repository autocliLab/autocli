const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-haiku-3-5-20241022': { input: 0.8, output: 4 },
}

const DEFAULT_PRICING = { input: 3, output: 15 }

export class TokenCounter {
  totalInput = 0
  totalOutput = 0
  private pricing: { input: number; output: number }

  constructor(model?: string) {
    this.pricing = model ? (MODEL_PRICING[model] || DEFAULT_PRICING) : DEFAULT_PRICING
  }

  add(usage: { input: number; output: number }): void {
    this.totalInput += usage.input
    this.totalOutput += usage.output
  }

  get totalCost(): number {
    return (
      (this.totalInput / 1_000_000) * this.pricing.input +
      (this.totalOutput / 1_000_000) * this.pricing.output
    )
  }

  formatCost(): string {
    return `$${this.totalCost.toFixed(4)}`
  }

  formatUsage(): string {
    return `${this.totalInput.toLocaleString()}↑ ${this.totalOutput.toLocaleString()}↓ (${this.formatCost()})`
  }
}
