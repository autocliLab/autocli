import { z } from 'zod'
import type { ToolDefinition } from '../tools/types.js'
import type { TeamManager } from './teamManager.js'
import { AgentStore } from '../agents/agentStore.js'
import { fromDefinition } from '../tools/agentTypes.js'

export function createTeamTools(teamManager: TeamManager) {
  const teamCreate: ToolDefinition = {
    name: 'TeamCreate',
    description: 'Create a team of parallel agents to work on subtasks. Each worker runs independently. Use this when a job can be broken into independent pieces.',
    inputSchema: z.object({
      name: z.string().describe('Team name'),
      goal: z.string().describe('Overall goal'),
      workers: z.array(z.object({
        name: z.string().describe('Worker name (e.g., "researcher", "implementer")'),
        task: z.string().describe('Specific task for this worker'),
        agentType: z.string().optional().describe('Agent type: general-purpose, explore, plan, worker'),
        model: z.string().optional().describe('Model override: sonnet, opus, haiku'),
      })).describe('List of workers and their tasks'),
    }),
    isReadOnly: false,

    async call(input, context) {
      const { name, goal, workers } = input as {
        name: string; goal: string;
        workers: Array<{ name: string; task: string; agentType?: string; model?: string }>
      }

      const team = teamManager.createTeam(name, goal, workers)

      // Launch all workers in parallel as background agents
      const { runSubAgent } = await import('../engine/queryEngine.js')

      for (const worker of team.workers) {
        teamManager.startWorker(team.id, worker.id)

        // Check if this worker has a persistent agent definition
        const agentStore = new AgentStore()
        const agentDef = agentStore.loadAgent(worker.name)
        let workerPrompt: string
        let workerOptions: { subagentType?: string; model?: string } = {
          subagentType: worker.agentType,
          model: worker.model,
        }

        if (agentDef) {
          // Use persistent agent's instruction files in the prompt
          const fullPrompt = agentStore.buildSystemPrompt(agentDef)
          workerPrompt = `${fullPrompt}\n\nYou are worker "${worker.name}" on team "${team.name}".\n\nTeam goal: ${team.goal}\n\nYour specific task: ${worker.task}\n\nComplete your task and report back with results. Be thorough but concise.`
          workerOptions = {
            subagentType: agentDef.agentType || worker.agentType,
            model: agentDef.model || worker.model,
          }
        } else {
          workerPrompt = `You are worker "${worker.name}" on team "${team.name}".\n\nTeam goal: ${team.goal}\n\nYour specific task: ${worker.task}\n\nComplete your task and report back with results. Be thorough but concise.`
        }

        // Fire and forget each worker
        ;(async () => {
          try {
            const result = await runSubAgent(
              workerPrompt,
              worker.name,
              context,
              workerOptions,
            )
            teamManager.completeWorker(team.id, worker.id, result)
          } catch (err) {
            teamManager.failWorker(team.id, worker.id, (err as Error).message)
          }
        })()
      }

      const workerList = team.workers.map(w => `  - ${w.name}: ${w.task.slice(0, 80)}`).join('\n')
      return {
        output: `Team "${name}" created with ${team.workers.length} workers:\n${workerList}\n\nAll workers launched in background. Use TeamStatus to check progress.`,
      }
    },
  }

  const teamStatus: ToolDefinition = {
    name: 'TeamStatus',
    description: 'Check the status of the current team and its workers.',
    inputSchema: z.object({
      teamId: z.string().optional().describe('Team ID (defaults to active team)'),
    }),
    isReadOnly: true,

    async call(input, _context) {
      const { teamId } = input as { teamId?: string }
      const team = teamId ? teamManager.getTeam(teamId) : teamManager.getActiveTeam()

      if (!team) return { output: 'No active team found.', isError: true }

      const workerLines = team.workers.map(w => {
        const icon = w.status === 'completed' ? '✓' : w.status === 'failed' ? '✗' : w.status === 'running' ? '▶' : '○'
        const elapsed = w.startedAt ? `${Math.round((Date.now() - w.startedAt) / 1000)}s` : ''
        const resultPreview = w.result ? ` — ${w.result.slice(0, 100)}...` : ''
        const errorPreview = w.error ? ` — ERROR: ${w.error.slice(0, 100)}` : ''
        return `  ${icon} ${w.name} [${w.status}] ${elapsed}${resultPreview}${errorPreview}`
      })

      const completed = team.workers.filter(w => w.status === 'completed').length
      const total = team.workers.length

      return {
        output: [
          `Team: ${team.name} [${team.status}]`,
          `Goal: ${team.goal}`,
          `Progress: ${completed}/${total} workers done`,
          '',
          ...workerLines,
        ].join('\n'),
      }
    },
  }

  const sendMessage: ToolDefinition = {
    name: 'SendMessage',
    description: 'Send a follow-up message or instruction to a specific worker or agent by ID.',
    inputSchema: z.object({
      to: z.string().describe('Worker ID to message'),
      message: z.string().describe('The message to send'),
    }),
    isReadOnly: true,

    async call(input, context) {
      const { to, message } = input as { to: string; message: string }

      // Find worker
      const found = teamManager.getWorker(to)
      if (!found) {
        return { output: `Worker "${to}" not found. Use TeamStatus to see available workers.`, isError: true }
      }

      if (found.worker.status !== 'running') {
        return { output: `Worker "${found.worker.name}" is ${found.worker.status}, cannot send message.`, isError: true }
      }

      // Spawn a new agent with the context of the original worker task plus the new instruction
      const { runSubAgent } = await import('../engine/queryEngine.js')
      const result = await runSubAgent(
        `You are continuing work for worker "${found.worker.name}" on team "${found.team.name}".\n\nOriginal task: ${found.worker.task}\n\nNew instruction: ${message}\n\nContinue the work.`,
        `followup-${found.worker.name}`,
        context,
        { subagentType: found.worker.agentType, model: found.worker.model },
      )

      return { output: `Message delivered. Response:\n${result}` }
    },
  }

  return { teamCreate, teamStatus, sendMessage }
}
