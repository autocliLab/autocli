# Features Needed

Prioritized feature list for autocli, based on gap analysis against the reference claude-code project.

Last updated: 2026-04-01

---

## Must-Have Features

### Feature 1: MCP (Model Context Protocol) Integration
- **Category:** tool / infrastructure
- **Priority:** must-have
- **Difficulty:** large (500+ lines)
- **What:** MCP lets users connect external tool servers (databases, APIs, custom tools) into the CLI session. Without it, autocli is a closed system with only its built-in tools. The reference has full MCP client support with SSE and stdio transports, an `/mcp` command to add/remove servers, `MCPTool` for execution, `ListMcpResources`/`ReadMcpResource` tools, and `McpAuth` for authenticated servers.
- **Where:** New `src/mcp/` directory (client, transports), new tools (`mcpTool.ts`, `listMcpResources.ts`, `readMcpResource.ts`), new command `src/commands/mcp.ts`, update `registerAll.ts`
- **Depends on:** Nothing

### Feature 2: TodoWrite Tool
- **Category:** tool
- **Priority:** must-have
- **Difficulty:** medium (100-500 lines)
- **What:** A structured todo/checklist that the model uses to track progress on multi-step tasks. This is one of the most impactful tools for task quality -- without it, the model loses track of what it has and hasn't done on complex requests. The reference treats this as a core tool.
- **Where:** New `src/tools/todoWrite.ts`, update `registerAll.ts`
- **Depends on:** Nothing

### Feature 3: NotebookEdit Tool
- **Category:** tool
- **Priority:** must-have
- **Difficulty:** medium (100-500 lines)
- **What:** Edit Jupyter notebook cells (`.ipynb` files) by cell ID. Without this, users working with notebooks have to manually copy code in and out. The reference supports insert, replace, and delete operations on notebook cells.
- **Where:** New `src/tools/notebookEdit.ts`, update `registerAll.ts`
- **Depends on:** Nothing

### Feature 4: Bash Security Hardening
- **Category:** infrastructure
- **Priority:** must-have
- **Difficulty:** large (500+ lines)
- **What:** The current bash tool has a 6-line regex blocklist for dangerous commands. The reference has ~12,000 lines of bash security: path validation, sed edit parsing, read-only validation, destructive command warnings, command semantics analysis, and sandboxing support. autocli is currently vulnerable to prompt injection attacks that could delete files or exfiltrate data. Key gaps: no path-based restrictions, no read-only mode enforcement, no pipe/redirect analysis, no destructive command confirmation.
- **Where:** Expand `src/tools/bash.ts`, new `src/tools/bashSecurity.ts` and `src/tools/bashPermissions.ts`
- **Depends on:** Nothing

### Feature 5: /config Command
- **Category:** command
- **Priority:** must-have
- **Difficulty:** medium (100-500 lines)
- **What:** Users need a way to view and change settings interactively -- API keys, default model, permission mode, theme, hooks, etc. Currently the only way to configure is by manually editing the JSON file or using CLI flags. The reference has a full config panel with aliases `/settings`.
- **Where:** New `src/commands/config.ts`, possibly update `src/utils/config.ts` for validation
- **Depends on:** Nothing

### Feature 6: /permissions Command
- **Category:** command
- **Priority:** must-have
- **Difficulty:** small (< 100 lines)
- **What:** View and manage tool permission rules (always-allow, always-deny, ask). Currently users can only toggle yolo mode. The reference lets users manage granular rules per tool and per path pattern.
- **Where:** New `src/commands/permissions.ts`, update `src/permissions/rules.ts`
- **Depends on:** Nothing

### Feature 7: File Edit History / Undo
- **Category:** infrastructure
- **Priority:** must-have
- **Difficulty:** medium (100-500 lines)
- **What:** Track file edits so they can be undone. Currently `/rewind` removes conversation turns but does not revert file changes. If the model makes a bad edit, the user has to manually fix it or use git. The reference tracks file modification history and can revert specific edits.
- **Where:** New `src/tools/fileHistory.ts`, update `src/tools/fileEdit.ts` and `src/tools/fileWrite.ts` to record before-state, update `src/commands/rewind.ts` to offer file revert
- **Depends on:** Nothing

### Feature 8: ToolSearch / Deferred Tools
- **Category:** tool
- **Priority:** must-have
- **Difficulty:** medium (100-500 lines)
- **What:** When there are many tools (especially with MCP), sending all tool schemas to the model wastes tokens and confuses it. ToolSearch lets the model discover tools on demand by searching a registry. The reference defers rarely-used tools and loads them via ToolSearch.
- **Where:** New `src/tools/toolSearch.ts`, update `src/tools/registry.ts` to support deferred tools, update `registerAll.ts`
- **Depends on:** Feature 1 (MCP) benefits from this, but can be built independently

### Feature 9: Prompt Caching
- **Category:** infrastructure
- **Priority:** must-have
- **Difficulty:** medium (100-500 lines)
- **What:** The Anthropic API supports prompt caching (`cache_control` on system/message blocks) which can cut costs by 90% for long conversations. autocli currently ignores this entirely -- every turn re-sends the full system prompt and tool definitions at full price. The `cache_creation_input_tokens` and `cache_read_input_tokens` fields exist in the code but are always set to 0.
- **Where:** Update `src/engine/queryEngine.ts` to add `cache_control: { type: "ephemeral" }` to system prompt and early message blocks, update `src/engine/tokenCounter.ts` to track cached vs uncached tokens
- **Depends on:** Nothing

### Feature 10: PDF Reading Support
- **Category:** tool
- **Priority:** must-have
- **Difficulty:** medium (100-500 lines)
- **What:** The FileRead tool currently handles text files and images but not PDFs. The reference supports reading PDFs with page-range selection. PDF reading is essential for users working with documentation, research papers, or specs.
- **Where:** Update `src/tools/fileRead.ts` to detect `.pdf` extension and extract text (using a library like `pdf-parse` or Bun's built-in capabilities), add `pages` parameter to input schema
- **Depends on:** May need a new dependency

---

## Nice-to-Have Features

### Feature 11: /theme Command
- **Category:** command / UI
- **Priority:** nice-to-have
- **Difficulty:** medium (100-500 lines)
- **What:** Switch between color themes. The current theme is hardcoded in `src/ui/theme.ts` (16 lines). The reference supports multiple themes. Users on light terminals or with color preferences are stuck.
- **Where:** Expand `src/ui/theme.ts` with theme presets, new `src/commands/theme.ts`, persist choice in config
- **Depends on:** Feature 5 (/config)

### Feature 12: /hooks Command
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** View and manage hooks (before_response, after_response, on_error) interactively. Currently hooks can only be configured by editing the config JSON. The reference has a `/hooks` command.
- **Where:** New `src/commands/hooks.ts`
- **Depends on:** Nothing

### Feature 13: /login and /logout Commands
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** medium (100-500 lines)
- **What:** OAuth-based authentication flow for Anthropic accounts. Currently users must manually set API keys via `--set-key` or environment variables. The reference has a full login flow with OAuth and account linking.
- **Where:** New `src/commands/login.ts`, `src/commands/logout.ts`, new `src/auth/` directory
- **Depends on:** Nothing

### Feature 14: /share Command
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** medium (100-500 lines)
- **What:** Export a conversation as a shareable link or formatted document. Currently `/export` writes to a local file. The reference has `/share` for creating web-accessible conversation summaries.
- **Where:** New `src/commands/share.ts`
- **Depends on:** Nothing

### Feature 15: /resume Command (Proper)
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** Interactive session picker to resume a previous session. Currently `--resume` is a CLI flag only. The reference has an in-REPL `/resume` command with fuzzy search.
- **Where:** New `src/commands/resume.ts`, leverage existing `src/session/sessionStore.ts` and `src/ui/fuzzyPicker.ts`
- **Depends on:** Nothing

### Feature 16: /usage Command
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** Show detailed token usage breakdown: cached vs uncached tokens, cost per model, usage over time. Currently `/cost` shows a single total. The reference has a detailed `/usage` view.
- **Where:** New `src/commands/usage.ts`, update `src/engine/tokenCounter.ts` to track per-model and per-turn stats
- **Depends on:** Feature 9 (prompt caching) for cache stats

### Feature 17: SleepTool
- **Category:** tool
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** Let the model pause execution for a specified duration. Useful for waiting on builds, deployments, or rate-limited APIs. The reference includes this as a primitive tool.
- **Where:** New `src/tools/sleep.ts`, update `registerAll.ts`
- **Depends on:** Nothing

### Feature 18: ConfigTool (Model-Accessible)
- **Category:** tool
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** Let the model read and modify user settings programmatically (e.g., "turn on yolo mode" as a natural language request). Distinct from the /config command -- this is a tool the model can call.
- **Where:** New `src/tools/configTool.ts`, update `registerAll.ts`
- **Depends on:** Feature 5 (/config)

### Feature 19: BriefTool
- **Category:** tool
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** Tool for the model to output concise summaries without full markdown rendering. Used when the model wants to give a quick status update rather than a verbose explanation.
- **Where:** New `src/tools/brief.ts`, update `registerAll.ts`
- **Depends on:** Nothing

### Feature 20: LSP Integration
- **Category:** tool
- **Priority:** nice-to-have
- **Difficulty:** large (500+ lines)
- **What:** Connect to Language Server Protocol servers for type-aware code intelligence (go-to-definition, find references, diagnostics). The reference has an LSPTool with formatters, symbol context, and schema validation. This would significantly improve code editing quality.
- **Where:** New `src/tools/lsp.ts`, new `src/lsp/` directory for LSP client, update `registerAll.ts`
- **Depends on:** Nothing, but complex

### Feature 21: Worktree Tools (EnterWorktree / ExitWorktree)
- **Category:** tool
- **Priority:** nice-to-have
- **Difficulty:** medium (100-500 lines)
- **What:** Create and switch to git worktrees for isolated work. The reference has `EnterWorktree` and `ExitWorktree` tools that let the model create a new worktree, work in isolation, and return to the original. Useful for parallel feature development.
- **Where:** New `src/tools/worktree.ts`, update `registerAll.ts`, update `src/git/git.ts`
- **Depends on:** Nothing

### Feature 22: /version Command
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** Show version info, current model, provider, config path, and environment details inside the REPL. Currently `--version` only works as a CLI flag.
- **Where:** New `src/commands/version.ts`
- **Depends on:** Nothing

### Feature 23: Extended Thinking Controls
- **Category:** infrastructure
- **Priority:** nice-to-have
- **Difficulty:** medium (100-500 lines)
- **What:** The engine handles `thinking` blocks from the API but provides no user controls: no way to enable/disable extended thinking, set budget tokens, or view thinking content in detail. The reference has `/thinkback` to replay thinking and configurable thinking budgets.
- **Where:** Update `src/engine/queryEngine.ts` to support `thinking` parameter in API calls, new `src/commands/thinkback.ts`, update config schema
- **Depends on:** Nothing

### Feature 24: Voice Mode
- **Category:** UI
- **Priority:** nice-to-have
- **Difficulty:** large (500+ lines)
- **What:** Speech-to-text input and text-to-speech output. The reference has a full `/voice` command with STT/TTS integration, language detection, and configurable voice settings.
- **Where:** New `src/voice/` directory, new `src/commands/voice.ts`
- **Depends on:** External STT/TTS services

### Feature 25: Onboarding Flow
- **Category:** UI
- **Priority:** nice-to-have
- **Difficulty:** medium (100-500 lines)
- **What:** First-run experience that walks new users through API key setup, model selection, and basic commands. Currently new users get dropped into the REPL with no guidance beyond `/help`.
- **Where:** New `src/ui/onboarding.ts`, update `src/index.ts` to detect first run
- **Depends on:** Feature 5 (/config)

---

## Future Features

### Feature 26: REPL Tool
- **Category:** tool
- **Priority:** future
- **Difficulty:** medium (100-500 lines)
- **What:** Run code in a persistent REPL session (Node.js, Python, etc.) rather than spawning a new bash process each time. Useful for iterative development and data exploration.
- **Where:** New `src/tools/repl.ts`, update `registerAll.ts`
- **Depends on:** Nothing

### Feature 27: PowerShell Tool
- **Category:** tool
- **Priority:** future
- **Difficulty:** medium (100-500 lines)
- **What:** Windows-native command execution via PowerShell. Currently the Bash tool assumes a Unix shell. The reference has a separate PowerShell tool for Windows support.
- **Where:** New `src/tools/powershell.ts`, update `registerAll.ts`, conditionally register based on OS
- **Depends on:** Nothing

### Feature 28: Remote Triggers / ScheduleCron Tool
- **Category:** tool
- **Priority:** future
- **Difficulty:** medium (100-500 lines)
- **What:** Model-accessible tool to create and manage scheduled/remote agent triggers. autocli has a scheduler system but it's only accessible via the `/schedule` command, not as a tool the model can use.
- **Where:** New `src/tools/scheduleCron.ts`, new `src/tools/remoteTrigger.ts`, update `registerAll.ts`
- **Depends on:** Existing scheduler infrastructure

### Feature 29: Sandbox Execution
- **Category:** infrastructure
- **Priority:** future
- **Difficulty:** large (500+ lines)
- **What:** Run bash commands in an isolated sandbox (Docker container or similar) to prevent damage to the host system. The reference has `shouldUseSandbox` logic and sandbox integration. Critical for production/enterprise use.
- **Where:** New `src/sandbox/` directory, update `src/tools/bash.ts`
- **Depends on:** Docker or similar runtime

### Feature 30: Plugin System
- **Category:** infrastructure
- **Priority:** future
- **Difficulty:** large (500+ lines)
- **What:** Load third-party plugins that add commands, tools, or UI components. The reference has a full plugin architecture with `reload-plugins`, moved-to-plugin migration, and plugin discovery.
- **Where:** New `src/plugins/` directory, plugin manifest schema, loader, and registry
- **Depends on:** Stable tool/command registry APIs

### Feature 31: IDE Integration Commands
- **Category:** command
- **Priority:** future
- **Difficulty:** medium (100-500 lines)
- **What:** Open files in the user's IDE (VS Code, etc.) and receive diagnostics back. The reference has `/ide` integration.
- **Where:** New `src/commands/ide.ts`
- **Depends on:** Nothing

### Feature 32: /feedback Command
- **Category:** command
- **Priority:** future
- **Difficulty:** small (< 100 lines)
- **What:** Let users submit feedback or bug reports directly from the REPL. The reference has `/feedback` for this.
- **Where:** New `src/commands/feedback.ts`
- **Depends on:** A feedback endpoint or email integration

---

## Summary

| Priority | Count | Key Impact |
|----------|-------|------------|
| Must-have | 10 | Security (bash hardening), cost savings (prompt caching), ecosystem (MCP), task quality (TodoWrite) |
| Nice-to-have | 15 | UX polish (config, theme, onboarding), developer productivity (LSP, worktrees, voice) |
| Future | 7 | Platform expansion (Windows, plugins, sandboxing, IDE) |

The single highest-impact change is **Feature 4 (Bash Security Hardening)** -- it's a safety issue. The highest-impact user-facing feature is **Feature 1 (MCP Integration)** -- it unlocks the entire MCP ecosystem. The highest-impact cost optimization is **Feature 9 (Prompt Caching)** -- it can cut API costs by up to 90%.

---

## Additional Gaps (Scout Phase 2)

### Feature 33: Multi-line Input Support
- **Category:** UI
- **Priority:** must-have
- **Difficulty:** medium (100-500 lines)
- **What:** The input handler uses `readline.createInterface` which is single-line only. Users cannot paste multi-line code blocks or write multi-line prompts. The reference project supports multi-line input with paste detection.
- **Where:** Update `src/ui/input.ts` to detect pastes and support multi-line editing
- **Depends on:** Nothing

### Feature 34: /add-dir Command
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** medium (100-500 lines)
- **What:** Add additional working directories to the context. autocli only supports a single working directory. For monorepo users or cross-project work, this is important.
- **Where:** New `src/commands/addDir.ts`, update context manager
- **Depends on:** Nothing

### Feature 35: /rename Command
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** Rename sessions interactively. autocli has no way to name/rename sessions except auto-titling from the first message.
- **Where:** New `src/commands/rename.ts`, update `src/session/sessionStore.ts`
- **Depends on:** Nothing

### Feature 36: Image/Clipboard Paste Input
- **Category:** UI
- **Priority:** nice-to-have
- **Difficulty:** medium (100-500 lines)
- **What:** Detect pasted images and include them in the conversation. autocli has no image input path (only image reading via FileRead).
- **Where:** Update `src/ui/input.ts`, add clipboard detection
- **Depends on:** Feature 33 (Multi-line Input)

### Feature 37: /exit Command (Proper)
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** Register `/exit` as a proper command with cleanup logic instead of handling it inline in the REPL loop.
- **Where:** New `src/commands/exit.ts`, update `src/repl.ts`
- **Depends on:** Nothing

### Feature 38: Session Backgrounding
- **Category:** infrastructure
- **Priority:** nice-to-have
- **Difficulty:** medium (100-500 lines)
- **What:** Put sessions in the background and foreground them later. The reference has `useSessionBackgrounding`. autocli has no way to background and foreground sessions.
- **Where:** New `src/session/backgrounding.ts`, update REPL
- **Depends on:** Nothing

### Feature 39: Advanced Compaction Strategies
- **Category:** infrastructure
- **Priority:** must-have
- **Difficulty:** large (500+ lines)
- **What:** The reference has sophisticated compaction: micro-compact, API-based compact, auto-compact with time-based config, grouping, post-compact cleanup. autocli has a basic `compactWithLLM` that's a single summarization pass. This directly affects cost and context window management.
- **Where:** Update `src/engine/contextManager.ts`, new compaction strategy modules
- **Depends on:** Nothing

### Feature 40: /branch Command
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** Git branch management from within the REPL.
- **Where:** New `src/commands/branch.ts`
- **Depends on:** Nothing

### Feature 41: /env Command
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** Manage environment variables visible to the session.
- **Where:** New `src/commands/env.ts`
- **Depends on:** Nothing

### Feature 42: /memory Command
- **Category:** command
- **Priority:** nice-to-have
- **Difficulty:** small (< 100 lines)
- **What:** View and manage memories interactively. The infrastructure exists in `src/memory/` but has no user-facing command.
- **Where:** New `src/commands/memory.ts`
- **Depends on:** Nothing
