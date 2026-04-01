import type { CommandDefinition } from './types.js'
import { theme } from '../ui/theme.js'
import { saveConfig, loadConfig } from '../utils/config.js'

export const activateCommand: CommandDefinition = {
  name: 'activate',
  description: 'Activate license with a key',

  async run(args, _context) {
    if (args.length === 0) {
      const config = loadConfig()
      if (config.licenseKey) {
        return `License: ${theme.success('Active')} (${config.licenseKey.slice(0, 8)}...)`
      }
      return 'No license key set. Usage: /activate <key>'
    }

    const key = args[0]
    const config = loadConfig()
    config.licenseKey = key
    saveConfig(config)
    return theme.success(`License activated: ${key.slice(0, 8)}...`)
  },
}
