import chalk from 'chalk'

export function formatDiff(diff: string): string {
  return diff.split('\n').map(line => {
    if (line.startsWith('+++') || line.startsWith('---')) return chalk.bold(line)
    if (line.startsWith('@@')) return chalk.cyan(line)
    if (line.startsWith('+')) return chalk.green(line)
    if (line.startsWith('-')) return chalk.red(line)
    return line
  }).join('\n')
}

export function formatEditDiff(filePath: string, oldStr: string, newStr: string): string {
  const header = chalk.bold(`  ${filePath}`)
  const oldLines = oldStr.split('\n').map(l => chalk.red(`- ${l}`))
  const newLines = newStr.split('\n').map(l => chalk.green(`+ ${l}`))
  return [header, ...oldLines, ...newLines].join('\n')
}
