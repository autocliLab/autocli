# Bugs Fixed

Date: 2026-04-01

## Fixed (Critical/High)

### Bug 1: AgentStore.loadAgent and loadTeam throw instead of returning null (HIGH) - FIXED
- **Files changed:** `src/agents/agentStore.ts`, `src/commands/agents.ts`
- **Fix:** Changed `loadAgent` and `loadTeam` to return `undefined` when not found or corrupted, instead of throwing. Updated callers in `agents.ts` to handle undefined.
- **Commit:** `fix: AgentStore.loadAgent and loadTeam return undefined instead of throwing`

### Bug 6: Compaction creates invalid message sequence violating API constraints (HIGH) - FIXED
- **File changed:** `src/engine/contextManager.ts`
- **Fix:** When `recentMessages[0]` has role `assistant`, the "Understood" filler assistant message is omitted to prevent consecutive assistant messages.
- **Commit:** `fix: compaction preserves message alternation and tool_use/tool_result pairs`

### Bug 8: SSRF bypass in WebFetch via DNS rebinding (HIGH) - FIXED
- **File changed:** `src/tools/webFetch.ts`
- **Fix:** After hostname string check, DNS is resolved and all resolved IPs are validated against the same internal range blocklist.
- **Commit:** `fix: prevent SSRF bypass via DNS rebinding in WebFetch`

### Bug 17: ContextManager.fitToContext drops messages without preserving tool_use/tool_result pairs (HIGH) - FIXED
- **File changed:** `src/engine/contextManager.ts`
- **Fix:** When building the result array, tool_use assistant messages and their corresponding tool_result user messages are now treated as atomic pairs during budget calculation.
- **Commit:** `fix: compaction preserves message alternation and tool_use/tool_result pairs` (combined with Bug 6)

### Bug 19: Bash tool's DENY_PATTERNS can be trivially bypassed (HIGH) - FIXED
- **File changed:** `src/tools/bash.ts`
- **Fix:** Added `\bbash\s+-c\b` and `\bsh\s+-c\b` patterns to DENY_PATTERNS to block shell -c invocations that could wrap dangerous commands.
- **Commit:** `fix: block bash -c and sh -c in Bash tool deny patterns`

## Fixed (full-audit pass, 2026-04-01)

### Bug 1 (critical): AgentStore.loadAgent() throws but callers expect null/undefined - ALREADY FIXED
- Already fixed in commit `981623d`. No action taken.

### Bug 2 (high): AgentStore.loadTeam() throws but callers expect null/undefined - ALREADY FIXED
- Already fixed in commit `981623d`. No action taken.

### Bug 3 (high): WsHandler set_max_tokens modifies a snapshot, not the live config - FIXED
- **Files changed:** `src/engine/queryEngine.ts`, `src/remote/wsHandler.ts`
- **Fix:** Added `setMaxTokens(n)` method to QueryEngine that mutates `this.config.maxTokens`. Updated WsHandler to call `session.engine.setMaxTokens(tokens)` instead of modifying a detached snapshot copy.
- **Commit:** `fix: WsHandler set_max_tokens now mutates live config instead of snapshot`

### Bug 4 (high): Bash tool zombie process group on timeout - FIXED
- **File changed:** `src/tools/bash.ts`
- **Fix:** On timeout, use `process.kill(-proc.pid, signal)` (negative PID) to signal the entire process group created by `setsid`, instead of `proc.kill(signal)` which only kills the wrapper. Added null check on `proc.pid` with fallback to `proc.kill()`.
- **Commit:** `fix: kill entire process group on bash tool timeout to prevent zombies`

### Bug 7/22 (high/security): Skill tool shell block command injection via args - SKIPPED (not a bug)
- The bug report describes `{{ args }}` substitution happening before shell block execution. In the current code, `executeShellBlocks()` runs BEFORE `{{ args }}` substitution (line 92 vs line 100 in skillTool.ts), so the described injection vector does not exist. The SHELL_DENY list is weak but that is a separate hardening concern, not a critical/high bug.

### Bug 11 (high): Race condition -- RC client input polling modifies messages array concurrently - FIXED
- **File changed:** `src/repl.ts`
- **Fix:** Added an async mutex (`withEngineLock`) that serializes all `engine.run()` calls. Both the main REPL loop and the RC poll loop now acquire the lock before mutating `messages` and calling `engine.run()`.
- **Commit:** `fix: prevent concurrent engine.run() calls between main REPL and RC poll`

### Bug 15 (high/security): --dangerously-skip-permissions hardcoded in claude-local provider - FIXED
- **File changed:** `src/providers/claudeLocal.ts`
- **Fix:** Changed the hardcoded `--dangerously-skip-permissions` flag to only be included when `config.permissionMode === 'auto-approve'`.
- **Commit:** `fix: only pass --dangerously-skip-permissions when permissionMode is auto-approve`

## Skipped (Medium/Low - out of scope)

- Bug 5 (medium), Bug 6 (medium), Bug 8 (low), Bug 9 (medium), Bug 10 (medium), Bug 12 (low), Bug 13 (medium), Bug 14 (medium), Bug 16 (medium), Bug 17 (medium), Bug 18 (medium), Bug 19 (medium), Bug 20 (medium), Bug 21 (medium)
