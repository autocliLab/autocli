import chalk from 'chalk'
import { highlightCode } from './syntaxHighlight.js'
import { theme } from './theme.js'

function renderTable(rows: string[][]): string {
  if (rows.length === 0) return ''

  // Calculate column widths
  const colCount = Math.max(...rows.map(r => r.length))
  const widths: number[] = Array(colCount).fill(0)
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      widths[i] = Math.max(widths[i], (row[i] || '').length)
    }
  }

  const lines: string[] = []
  const separator = widths.map(w => '─'.repeat(w + 2)).join('┼')

  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r].map((cell, i) => ` ${(cell || '').padEnd(widths[i])} `)
    const rowStr = cells.join('│')

    if (r === 0) {
      // Header row
      lines.push(chalk.bold(rowStr))
      lines.push(chalk.dim(separator))
    } else {
      lines.push(rowStr)
    }
  }

  return lines.join('\n')
}

export function renderMarkdown(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inCodeBlock = false
  let codeBlockLang = ''
  let codeLines: string[] = []
  let inTable = false
  let tableRows: string[][] = []

  for (const line of lines) {
    if (line.startsWith('```') && !inCodeBlock) {
      // Flush any pending table
      if (inTable && tableRows.length > 0) {
        result.push(renderTable(tableRows))
        inTable = false
        tableRows = []
      }
      inCodeBlock = true
      codeBlockLang = line.slice(3).trim()
      codeLines = []
      continue
    }

    if (line.startsWith('```') && inCodeBlock) {
      inCodeBlock = false
      const highlighted = highlightCode(codeLines.join('\n'), codeBlockLang)
      result.push(theme.dim('╭─' + (codeBlockLang ? `─ ${codeBlockLang} ` : '') + '─'.repeat(Math.max(0, 40 - (codeBlockLang?.length || 0))) + '╮'))
      for (const cl of highlighted.split('\n')) {
        result.push(theme.dim('│ ') + cl)
      }
      result.push(theme.dim('╰' + '─'.repeat(42) + '╯'))
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    // Table detection
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true
        tableRows = []
      }
      // Skip separator rows like |---|---|
      if (line.replace(/[|\-\s:]/g, '') === '') {
        continue
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      tableRows.push(cells)
      continue
    } else if (inTable) {
      // End of table — render it
      inTable = false
      result.push(renderTable(tableRows))
      tableRows = []
    }

    result.push(renderInline(line))
  }

  // Flush any pending table at end of text
  if (inTable && tableRows.length > 0) {
    result.push(renderTable(tableRows))
  }

  return result.join('\n')
}

function renderInline(line: string): string {
  // Headers
  const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
  if (headerMatch) {
    const level = headerMatch[1].length
    const text = headerMatch[2]
    if (level === 1) return chalk.bold.underline(text)
    if (level === 2) return chalk.bold(text)
    return chalk.bold.dim(text)
  }

  // Bullet lists
  if (/^\s*[-*]\s/.test(line)) {
    line = line.replace(/^(\s*)[-*]\s/, '$1• ')
  }

  // Numbered lists
  if (/^\s*\d+\.\s/.test(line)) {
    line = line.replace(/^(\s*)(\d+)\.\s/, `$1${chalk.dim('$2.')} `)
  }

  // Horizontal rule
  if (/^---+$/.test(line.trim())) {
    return theme.separator()
  }

  // Inline formatting
  line = line.replace(/\*\*(.+?)\*\*/g, (_, t) => chalk.bold(t))
  line = line.replace(/\*(.+?)\*/g, (_, t) => chalk.italic(t))
  line = line.replace(/`(.+?)`/g, (_, t) => chalk.bgGray.white(` ${t} `))
  line = line.replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) => `${chalk.blue.underline(text)} ${chalk.dim(`(${url})`)}`)

  // File paths with line numbers (e.g., src/file.ts:42)
  line = line.replace(/(?<![`\w])([a-zA-Z0-9_./-]+\.[a-zA-Z]{1,6})(:\d+)?(?![`\w])/g, (match, path, lineNum) => {
    if (path.includes('/') || path.includes('.ts') || path.includes('.js') || path.includes('.py')) {
      return chalk.underline.blue(match)
    }
    return match
  })

  return line
}
