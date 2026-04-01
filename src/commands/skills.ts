import type { CommandDefinition } from './types.js'
import { theme } from '../ui/theme.js'
import { SkillLoader } from '../skills/loader.js'
import { platform } from '../utils/platform.js'
import { join } from 'path'

export const skillsCommand: CommandDefinition = {
  name: 'skills',
  description: 'List available skills',

  async run(_args, _context) {
    const loader = new SkillLoader([
      join(platform.configDir, 'skills'),
    ])
    const skills = loader.list()
    if (skills.length === 0) {
      return [
        'No skills installed.',
        '',
        theme.dim(`Add skills to ${join(platform.configDir, 'skills')}/ as .md files with frontmatter.`),
      ].join('\n')
    }
    return [
      theme.bold('Available skills:'),
      '',
      ...skills.map(s => `  ${theme.tool(s.name)} — ${s.description}`),
      '',
      theme.dim('Invoke with: /skill-name or via the Skill tool'),
    ].join('\n')
  },
}
