import { z } from 'zod'
import type { ToolDefinition } from './types.js'

export const bashTool: ToolDefinition = {
  name: 'Bash',
  description: 'Execute a shell command. Use for: running tests, installing packages, git operations, and system commands. Do NOT use for file reading (use Read), file searching (use Glob/Grep), or file editing (use Edit).',
  inputSchema: z.object({
    command: z.string().describe('The shell command to execute'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default 120000)'),
  }),
  isReadOnly: false,

  async call(input, context) {
    const { command, timeout = 120_000 } = input as {
      command: string
      timeout?: number
    }

    // Dangerous command patterns
    const DENY_PATTERNS = [
      /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?\/(?!\w)/, // rm -rf / or rm -f /
      /\bgit\s+push\s+.*--force\s+.*(?:main|master)/i, // force push to main
      /\bgit\s+reset\s+--hard\b/,                      // git reset --hard
      /\bgit\s+clean\s+-[a-zA-Z]*f/,                   // git clean -f
      /\bchmod\s+777\b/,                                // chmod 777
      /\bcurl\s+.*\|\s*(?:bash|sh)\b/,                  // curl | bash
      /\bdd\s+.*of=\/dev\/[sh]d/,                       // dd to raw device
      /\bmkfs\b/,                                        // format filesystem
      /\b:(){ :\|:& };:\b/,                             // fork bomb
    ]

    const isDangerous = DENY_PATTERNS.some(p => p.test(command))
    if (isDangerous) {
      return {
        output: `Blocked: This command matches a dangerous pattern and was not executed. If you need to run it, ask the user to execute it manually.`,
        isError: true,
      }
    }

    const effectiveCwd = (context.sharedState?.bashCwd as string) || context.workingDir

    try {
      // Append pwd tracking to capture directory changes
      const trackingCommand = `${command}\n__exit=$?\necho "___AUTOCLI_CWD___$(pwd)"\nexit $__exit`

      // Use setsid so we can kill the entire process group on timeout
      const proc = Bun.spawn(['setsid', 'bash', '-c', trackingCommand], {
        cwd: effectiveCwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env },
      })

      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        try { process.kill(-proc.pid, 9) } catch { proc.kill(9) }
      }, timeout)

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ])

      clearTimeout(timer)
      const exitCode = await proc.exited

      if (timedOut) {
        return { output: `Command timed out after ${timeout}ms`, isError: true }
      }

      // Extract tracked cwd
      let userOutput = stdout
      const cwdMarker = '___AUTOCLI_CWD___'
      const markerIdx = stdout.lastIndexOf(cwdMarker)
      if (markerIdx !== -1) {
        userOutput = stdout.slice(0, markerIdx)
        const newCwd = stdout.slice(markerIdx + cwdMarker.length).trim()
        if (newCwd && context.sharedState) {
          context.sharedState.bashCwd = newCwd
        }
      }

      const output = (userOutput + (stderr ? '\n' + stderr : '')).trim()

      if (exitCode !== 0) {
        return { output: output || `Exit code: ${exitCode}`, isError: true }
      }

      return { output: output || '(no output)' }
    } catch (err) {
      return { output: `Error: ${(err as Error).message}`, isError: true }
    }
  },
}
