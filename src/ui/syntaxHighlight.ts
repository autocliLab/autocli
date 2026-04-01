import chalk from 'chalk'

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'class', 'return', 'if', 'else',
  'for', 'while', 'import', 'export', 'from', 'async', 'await',
  'try', 'catch', 'throw', 'new', 'this', 'super', 'extends',
  'default', 'switch', 'case', 'break', 'continue', 'typeof',
  'interface', 'type', 'enum', 'implements', 'public', 'private',
  'def', 'self', 'None', 'True', 'False', 'lambda', 'yield',
  'fn', 'pub', 'mut', 'impl', 'struct', 'trait', 'use', 'mod',
])

const HASH_COMMENT_LANGS = new Set(['python', 'py', 'ruby', 'rb', 'bash', 'sh', 'shell', 'zsh', 'yaml', 'yml', 'toml', 'perl', 'r', 'makefile', 'make', 'dockerfile', ''])

export function highlightCode(code: string, _lang?: string): string {
  // Extract strings and comments first to protect them from keyword/number highlighting
  const placeholders: string[] = []
  const placeholder = (s: string) => {
    const idx = placeholders.length
    placeholders.push(s)
    return `\x00PH${idx}\x00`
  }

  let result = code
  // Protect comments
  result = result.replace(/\/\/.*$/gm, (match) => placeholder(chalk.dim(match)))
  result = result.replace(/\/\*[\s\S]*?\*\//g, (match) => placeholder(chalk.dim(match)))
  // Only treat # as comment for languages that use it (avoid matching CSS colors, Rust attrs, etc.)
  if (HASH_COMMENT_LANGS.has((_lang || '').toLowerCase())) {
    result = result.replace(/#.*$/gm, (match) => placeholder(chalk.dim(match)))
  }
  // Protect strings — handle single/double quotes simply, backtick templates with ${} interpolation
  result = result.replace(/(["'])(?:(?!\1).)*\1/g, (match) => placeholder(chalk.green(match)))
  result = result.replace(/`(?:[^`\\]|\\.|\$\{[^}]*\})*`/g, (match) => placeholder(chalk.green(match)))

  // Now highlight keywords, types, and numbers in unprotected regions
  result = result.replace(/\b(\w+)\b/g, (match) => {
    if (KEYWORDS.has(match)) return chalk.magenta(match)
    if (/^[A-Z][a-zA-Z]*$/.test(match)) return chalk.yellow(match)
    return match
  })
  result = result.replace(/\b(\d+)\b/g, (_, n) => chalk.cyan(n))

  // Restore placeholders
  result = result.replace(/\x00PH(\d+)\x00/g, (_, idx) => placeholders[Number(idx)])
  return result
}
