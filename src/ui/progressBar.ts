import { theme } from './theme.js'

const BLOCKS = ['░', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█']

export function renderProgressBar(fraction: number, width = 30, label?: string): string {
  const clamped = Math.max(0, Math.min(1, fraction))
  const totalSubBlocks = width * 8
  const filledSubBlocks = Math.round(clamped * totalSubBlocks)
  const fullBlocks = Math.floor(filledSubBlocks / 8)
  const remainder = filledSubBlocks % 8

  let bar = BLOCKS[8].repeat(fullBlocks)
  if (remainder > 0 && fullBlocks < width) {
    bar += BLOCKS[remainder]
  }
  bar = bar.padEnd(width, BLOCKS[0])

  const pct = Math.round(clamped * 100)
  const colorFn = pct > 80 ? theme.error : pct > 60 ? theme.warning : theme.success
  const display = `${colorFn(bar)} ${pct}%`
  return label ? `${label} ${display}` : display
}
