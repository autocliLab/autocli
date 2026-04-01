import type { CommandDefinition } from './types.js'
import { SessionStore } from '../session/sessionStore.js'
import { platform } from '../utils/platform.js'
import { theme } from '../ui/theme.js'
import { join } from 'path'

export const sessionsCommand: CommandDefinition = {
  name: 'sessions',
  description: 'List saved sessions (use --pick for interactive selection)',
  aliases: ['resume-list'],
  async run(args, _context) {
    const store = new SessionStore(join(platform.configDir, 'sessions'))
    const list = store.list()

    if (list.length === 0) return 'No saved sessions.'

    // Interactive picker mode
    if (args.includes('--pick') || args.includes('-p')) {
      const { showFuzzyPicker } = await import('../ui/fuzzyPicker.js')
      const items = list.slice(0, 50).map(s => ({
        label: `${s.id} — ${s.title || 'Untitled'} (${s.messageCount} msgs)`,
        value: s.id,
        description: `${new Date(s.updatedAt).toLocaleDateString()} ${s.workingDir}`,
      }))
      const picked = await showFuzzyPicker(items, 'Select session: ')
      if (picked) {
        return `Resume with: autocli --resume ${picked}`
      }
      return theme.dim('No session selected.')
    }

    const lines = list.slice(0, 20).map(s => {
      const date = new Date(s.updatedAt).toLocaleDateString()
      const time = new Date(s.updatedAt).toLocaleTimeString()
      const titleStr = s.title ? ` ${theme.info(s.title)}` : ''
      return `  ${theme.bold(s.id)} ${theme.dim(`${date} ${time}`)} ${s.messageCount} msgs${titleStr} ${theme.dim(s.workingDir)}`
    })

    return [
      theme.bold('Saved sessions:'),
      '',
      ...lines,
      '',
      theme.dim('Resume with: autocli --resume <id>'),
      theme.dim('Use /sessions --pick for interactive selection'),
    ].join('\n')
  },
}
