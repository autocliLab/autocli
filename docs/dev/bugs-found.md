# Bug Audit Report for autocli

Last updated: 2026-04-01

---

### Bug 1: AgentStore.loadAgent() throws but callers expect null/undefined
- **File:** src/agents/agentStore.ts:44-56
- **Severity:** critical
- **What:** `loadAgent()` throws `new Error('Agent not found: ...')` when an agent is not found. However, multiple callers treat the return value as nullable without catching. In `src/repl.ts:299`, `agentStore.loadAgent(a.agentName)` is called inside the scheduler with `const def = agentStore.loadAgent(a.agentName)` followed by `def?.agentType` -- but if the agent does not exist, `loadAgent` throws before the optional chain can protect, crashing the scheduler callback and leaving the promise unhandled. The same pattern appears in `src/team/teamTools.ts:39` and `src/tools/agentTypes.ts:52`.
- **Reproduce:** Create a team with an agent name that does not exist in `~/.autocli/agents/`. The scheduler fires, calls `loadAgent(nonExistent)`, throws, the `.catch` on line 316 logs it but the team workers are never started. For `teamTools.ts`, calling TeamCreate with a worker name matching no persisted agent definition will throw, crash the fire-and-forget IIFE, and silently fail the worker.
- **Fix:** Change `loadAgent` to return `undefined` when the file doesn't exist: change lines 47-48 to `if (!existsSync(jsonPath)) return undefined` and update the return type to `AgentDefinition | undefined`.

### Bug 2: AgentStore.loadTeam() throws but callers expect null/undefined
- **File:** src/agents/agentStore.ts:135-145
- **Severity:** high
- **What:** Same pattern as Bug 1. `loadTeam()` throws when not found, but `src/index.ts:92` checks `if (!template)` which will never be reached because the throw happens first. Same at `src/repl.ts:565`.
- **Reproduce:** Run `autocli --run-team nonexistent` or use `/schedule run nonexistent`. Instead of a user-friendly "Team not found" message, the user gets an unhandled exception crash.
- **Fix:** Change `loadTeam` to return `undefined` when file not found, or wrap call sites in try/catch.

### Bug 3: WsHandler set_max_tokens modifies a snapshot, not the live config
- **File:** src/remote/wsHandler.ts:299-306
- **Severity:** high
- **What:** The `set_max_tokens` control action calls `session.engine.getConfigSnapshot()` which returns a shallow copy (`{ ...this.config }`), then sets `config.maxTokens = tokens` on that copy. Since it's a copy, the change never reaches the actual engine config. The max tokens setting has zero effect.
- **Reproduce:** Connect via WebSocket, authenticate, send `{"type":"control","action":"set_max_tokens","value":16384}`. The next query will still use the default 8192 max tokens.
- **Fix:** Add a `setMaxTokens(n: number)` method on `QueryEngine` that mutates `this.config.maxTokens`, then call that method here instead of modifying a snapshot.

### Bug 4: Bash tool zombie process group on timeout
- **File:** src/tools/bash.ts:87-92
- **Severity:** high
- **What:** When a command times out, the code calls `proc.kill('SIGTERM')` on the process, but it was spawned with `setsid` to create a process group. The SIGTERM only kills the `setsid` wrapper, not the process group. The child `bash` process and its descendants may continue running as orphaned zombie processes. The SIGKILL fallback 500ms later suffers the same problem.
- **Reproduce:** Run a command like `Bash({command: "sleep 1000", timeout: 1000})`. After 1 second, the sleep process will still be running in the background.
- **Fix:** Use `process.kill(-proc.pid, 'SIGTERM')` (negative PID to signal the entire process group) instead of `proc.kill('SIGTERM')`. Same for the SIGKILL fallback. Need to add a null check on `proc.pid`.

### Bug 5: HookRunner timeout leaves processes running as zombies
- **File:** src/hooks/hookRunner.ts:43-64
- **Severity:** medium
- **What:** When a hook times out, the code spawns a SIGTERM followed by a 500ms delayed SIGKILL, but the Promise.race has already returned 'timeout'. The stdout/stderr reading promises from `processPromise` are abandoned. Since `proc.stdout` and `proc.stderr` are still being read via `new Response()`, those Response objects may hold references to the pipe, preventing garbage collection and leaking file descriptors.
- **Reproduce:** Configure a hook that hangs (e.g., `sleep 999`). After 30 seconds, the hook is "timed out" but the Response.text() promises on stdout/stderr are never resolved or rejected, leaking resources.
- **Fix:** After killing the process on timeout, also call `proc.stdout?.cancel?.()` and `proc.stderr?.cancel?.()` or `proc.kill('SIGKILL')` to force-close the streams.

### Bug 6: Race condition in BackgroundTaskManager.create() -- process.kill(-pid) before proc.pid is assigned
- **File:** src/tasks/backgroundTask.ts:27-34
- **Severity:** medium
- **What:** `proc.unref()` is called on line 33, and `task.pid = proc.pid` on line 32. The `kill()` method on line 78 uses `process.kill(-task.pid, 'SIGTERM')`. However, `proc.pid` can be `undefined` if the process hasn't started yet. When pid is undefined, `process.kill(-undefined)` becomes `process.kill(NaN)` which throws an ERR_INVALID_ARG_TYPE. The `catch` block silently swallows this.
- **Reproduce:** Call `kill()` on a task immediately after `create()`, before the process has started. The kill will silently fail.
- **Fix:** Check `if (!task.pid)` before attempting to kill.

### Bug 7: Skill tool shell block command injection via args
- **File:** src/skills/skillTool.ts:5-48
- **Severity:** high (security)
- **What:** The `executeShellBlocks` function runs shell commands embedded in skill markdown content via `Bun.spawn(['bash', '-c', cmd])`. If `args` contains shell metacharacters and the skill template uses `{{ args }}`, the args are injected directly into a shell command.
- **Reproduce:** Create a skill with `` !`{{ args }}` ``. Invoke with args `$(cat /etc/passwd)`.
- **Fix:** Escape shell metacharacters in `args` substitution, or apply `args` substitution AFTER shell block execution.

### Bug 8: Session ID collision with 8-char UUID prefix
- **File:** src/session/sessionStore.ts:16-17
- **Severity:** low
- **What:** `randomUUID().slice(0, 8)` produces only 8 hex characters (32 bits of entropy). Birthday paradox means collisions become likely after ~65,000 sessions. A collision overwrites the previous session's data silently.
- **Reproduce:** Theoretical: create 65,536+ sessions.
- **Fix:** Use a longer prefix (12-16 chars) or include a timestamp prefix.

### Bug 9: contextManager.fitToContext does not preserve context when budget is exceeded
- **File:** src/engine/contextManager.ts:32-61
- **Severity:** medium
- **What:** When the total tokens exceed `maxTokens`, the code subtracts the last message from the budget first. If the second-to-last message is enormous, `fitToContext` will drop everything except the last message and claim it "summarized" the rest without actual summarization.
- **Reproduce:** Have a conversation with many messages where the second-to-last message is enormous.
- **Fix:** Add an explicit flag that indicates compaction happened so the caller can trigger actual LLM summarization.

### Bug 10: Wire listener exceptions crash the emit() caller
- **File:** src/wire/wire.ts:33-44
- **Severity:** medium
- **What:** `emit()` iterates over listeners and calls them directly. If any listener throws, the exception propagates up to the caller of `emit()`, which could be the engine's critical hot path.
- **Reproduce:** Register a Wire listener that throws: `wire.on('text', () => { throw new Error('boom') })`. The next `engine.run()` will crash.
- **Fix:** Wrap each listener call in a try-catch: `try { listener(event) } catch (e) { /* log and continue */ }`.

### Bug 11: Race condition -- RC client input polling modifies `messages` array concurrently
- **File:** src/repl.ts:586-612
- **Severity:** high
- **What:** The RC client poll loop is a fire-and-forget async IIFE. When it receives input, it pushes to `messages` and calls `engine.run(messages, workingDir)`. Meanwhile, the main REPL loop is also reading input, pushing to `messages`, and calling `engine.run(messages, workingDir)`. Both can run concurrently, mutating the same `messages` array simultaneously.
- **Reproduce:** Start an RC session with `/rc`, then type input in the terminal while also sending input from the browser.
- **Fix:** Use a mutex/lock around `messages` access, or queue RC inputs to be processed in the main REPL loop.

### Bug 12: TaskStore.nextId() is not actually atomic -- TOCTOU between processes
- **File:** src/tasks/taskStore.ts:83-98
- **Severity:** low
- **What:** The comment says "Atomic read-increment-write" but `openSync(path, 'a+')` does not acquire an exclusive lock. Two concurrent processes can both read the same high watermark value and create tasks with duplicate IDs.
- **Reproduce:** Launch two team workers simultaneously that each create tasks.
- **Fix:** Use `flock` or `lockfileSync`, or use UUIDs.

### Bug 13: BrainWriter.updateIndex() allocates 1MB buffer for every note write
- **File:** src/brain/writer.ts:140
- **Severity:** medium
- **What:** `Buffer.alloc(1024 * 1024)` allocates 1MB on every `updateIndex()` call. If the index file exceeds 1MB, `readSync` will read only the first 1MB, and the resulting truncated JSON will fail to parse, causing the index to be silently reset to empty.
- **Reproduce:** Accumulate enough brain notes that `_index.json` exceeds 1MB. The next note write will corrupt the index.
- **Fix:** Read the file size first with `fstatSync(fd)` and allocate accordingly, or use `readFileSync`.

### Bug 14: OpenAI streaming mode doesn't report token usage
- **File:** src/providers/openai.ts:140-142
- **Severity:** medium
- **What:** Token usage from the `usage` field in SSE chunks is only set if the provider includes it. Many OpenAI-compatible APIs don't include usage in streaming responses unless `stream_options: {include_usage: true}` is sent. The `inputTokens` and `outputTokens` will remain 0.
- **Reproduce:** Use the OpenAI provider with streaming enabled (default). Token counts will show 0.
- **Fix:** Pass `stream_options: { include_usage: true }` in the request body when streaming is enabled.

### Bug 15: `--dangerously-skip-permissions` hardcoded in claude-local provider
- **File:** src/providers/claudeLocal.ts:55
- **Severity:** high (security)
- **What:** The `callClaudeLocal` function always passes `--dangerously-skip-permissions` to the Claude CLI subprocess. This means all tool calls bypass permission checks, even when the user has configured `permissionMode: 'default'`.
- **Reproduce:** Set `permissionMode: "default"` in config and use the `claude-local` provider. All file writes and shell commands will be auto-approved.
- **Fix:** Only add `--dangerously-skip-permissions` when `config.permissionMode === 'auto-approve'`.

### Bug 16: Headless mode forces auto-approve permissions
- **File:** src/remote/headless.ts:32-34
- **Severity:** medium (security)
- **What:** The headless server hardcodes `mode: 'auto-approve'` for the permission config. Remote clients cannot control which tools are allowed.
- **Reproduce:** Start `autocli --headless`. Send a chat request that triggers a dangerous Bash command. It will be auto-approved.
- **Fix:** Connect the `pendingApprovals` system in `RemoteServer` to the `PermissionGate`, or default to 'default' mode.

### Bug 17: Skill tool allowed-tools restriction leaks to post-skill tool calls
- **File:** src/engine/queryEngine.ts:574
- **Severity:** medium
- **What:** If a skill sets `skillAllowedTools` in `sharedState`, ALL subsequent tool calls in that same `run()` are restricted by the skill's allowedTools. The restriction is never cleared within the loop, only after the entire run completes.
- **Reproduce:** Invoke a Skill that restricts tools to `[Read, Grep]`. In the same turn, the model then tries to use `Write`. It will be blocked.
- **Fix:** Clear `sharedState.skillAllowedTools` after the Skill tool result is added to `toolResults`, not after the entire run completes.

### Bug 18: Unhandled promise in repl.ts scheduler worker launch
- **File:** src/repl.ts:301-314
- **Severity:** medium
- **What:** The scheduler's `runTeamFn` callback launches workers in fire-and-forget IIFEs. `agentStore.loadAgent(a.agentName)` on line 299 (outside the IIFE) will throw if the agent doesn't exist (Bug 1), and the outer catch only logs the error -- it doesn't fail individual workers, leaving them in 'running' state forever.
- **Reproduce:** Have a scheduled team where one agent name doesn't exist. Workers show as 'running' forever.
- **Fix:** Validate all agent names before starting any workers, or wrap the agent lookup per-worker.

### Bug 19: Export command path traversal
- **File:** src/commands/export.ts:55
- **Severity:** medium
- **What:** The `/export` command calls `writeFileSync(filepath, ...)` directly, bypassing the permission system. The filename is user-controlled and there's no path traversal check.
- **Reproduce:** Run `/export ../../.bashrc`. The conversation will be written to `~/.bashrc`.
- **Fix:** Validate that the resolved filepath is within `context.workingDir`.

### Bug 20: SSRF bypass in WebFetch via DNS rebinding
- **File:** src/tools/webFetch.ts:28-48
- **Severity:** medium (security)
- **What:** The SSRF protection checks the hostname string against private IP patterns, but doesn't resolve DNS. An attacker could use a domain that resolves to `127.0.0.1` to bypass the check.
- **Reproduce:** Set up a DNS record for `evil.example.com` pointing to `127.0.0.1`. Use `WebFetch({url: 'http://evil.example.com:8080/admin'})`.
- **Fix:** Add a DNS resolution step before the fetch, or use a connect callback to verify the resolved IP.

### Bug 21: Memory extraction fallback runs with full tool access
- **File:** src/memory/autoExtract.ts:86-91
- **Severity:** medium
- **What:** The `runQuery` fallback at line 91 calls `engine.run()` which has full tool access. If the primary path fails, the fallback gives the LLM full tool access in a background context the user doesn't see.
- **Reproduce:** Set up a scenario where the direct API call fails. The fallback runs with all tools.
- **Fix:** Pass a tool-free engine or explicitly disable tools in the fallback query.

### Bug 22: Skill shell block command injection via args (duplicate of Bug 7, different vector)
- **File:** src/skills/skillTool.ts:5-48
- **Severity:** high (security)
- **What:** Same root cause as Bug 7. The `SHELL_DENY` blocklist is very limited and can be bypassed. The `{{ args }}` substitution happens before shell execution, enabling injection.
- **Reproduce:** Use args with encoded characters or command substitution that bypasses the deny list.
- **Fix:** Apply args substitution AFTER shell block execution, or use a proper shell escaping function.
