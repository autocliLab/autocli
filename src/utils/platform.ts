import { homedir } from 'os'
import { join } from 'path'

export const platform = {
  os: process.platform,
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  homeDir: homedir(),
  configDir: join(homedir(), '.mini-claude'),
  shell: process.env.SHELL || (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'),
  columns: process.stdout.columns || 80,
  rows: process.stdout.rows || 24,
}
