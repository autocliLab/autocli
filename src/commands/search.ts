import type { CommandDefinition } from './types.js'
import { searchTranscript, displaySearchResults } from '../ui/search.js'

export const searchCommand: CommandDefinition = {
  name: 'search',
  description: 'Search conversation transcript',
  aliases: ['find', 'grep'],

  async run(args, context) {
    const query = args.join(' ')
    if (!query) return 'Usage: /search <query>'

    const results = searchTranscript(context.messages, query)
    return displaySearchResults(results, query)
  },
}
