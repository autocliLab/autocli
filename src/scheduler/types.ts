export interface Schedule {
  id: string
  team: string             // team template name
  interval: number         // milliseconds
  lastRun: number | null   // epoch ms
  nextRun: number          // epoch ms
  enabled: boolean
  workingDir?: string      // override team's default
}
