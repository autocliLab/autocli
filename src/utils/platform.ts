import { homedir } from 'os'
import { join } from 'path'

export const platform = {
  os: process.platform,
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  homeDir: homedir(),
  configDir: join(homedir(), '.autocli'),
  shell: process.env.SHELL || (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'),
  get columns() { return process.stdout.columns || 80 },
  get rows() { return process.stdout.rows || 24 },
}
