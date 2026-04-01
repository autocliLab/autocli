import { theme } from './theme.js'
import { showDialog } from './dialog.js'

export type PermissionAnswer = 'yes' | 'no' | 'always'

export async function promptPermission(
  toolName: string,
  description: string,
): Promise<PermissionAnswer> {
  // Use the dialog system for a structured permission prompt
  const answer = await showDialog(
    `Tool: ${toolName}`,
    description,
    [
      { key: 'y', label: 'Yes — allow this call' },
      { key: 'a', label: 'Always — allow all future calls to this tool' },
      { key: 'n', label: 'No — deny this call' },
    ],
  )

  switch (answer) {
    case 'y': case 'yes': return 'yes'
    case 'a': case 'always': return 'always'
    default: return 'no'
  }
}
