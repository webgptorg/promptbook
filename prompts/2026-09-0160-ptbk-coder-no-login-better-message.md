[ ]

[✨🍺] When the harness is not logged in, or not authenticated, handle the error message more gracefully.

```bash
ptbk coder run --harness claude-code --thinking-level max --agent agents/coding/developer.book --context AGENTS.md
```

```log
Timestamp: 2026-09-09T15:32:20.666Z
Prompt: prompts/2026-09-0040-workshop-repository.md#1
Prompt file: C:\Users\me\work\promptbook-experiments-and-landing-pages\aldaron\prompts\2026-09-0040-workshop-repository.md
Prompt section: 1
Prompt summary: There should be an option to connect a project with a workshop.
Runner: Claude Code (claude-opus-5)

CLI output and error:
Error: {"type":"system","subtype":"init","cwd":"C:\\Users\\me\\work\\promptbook-experiments-and-landing-pages\\aldaron","session_id":"f48b319e-933e-45d6-8762-95e561e31476","tools":["Task","Bash","CronCreate","CronDelete","CronList","DesignSync","Edit","EnterWorktree","ExitWorktree","Glob","Grep","ListAgents","Monitor","NotebookEdit","PowerShell","PushNotification","Read","ReportFindings","ScheduleWakeup","SendMessage","Skill","TaskOutput","TaskStop","ToolSearch","WebFetch","WebSearch","Workflow","Write"],"mcp_servers":[],"model":"claude-opus-5","permissionMode":"default","slash_commands":["bailian-cli","bailian-docs-llm-wiki","bailian-finetune","bailian-gen","bailian-managed-agent","bailian-model-recommend","bailian-protocol","bailian-train-deploy","bailian-web-search","deep-research","design-sync","dataviz","update-config","verify","debug","code-review","simplify","batch","fewer-permission-prompts","doctor","loop","claude-api","workflow-authoring","run","run-skill-generator","agents","auto-mode-setup","autocompact","clear","color","compact","config","context","effort","fast","heapdump","init","mcp","import","model","__remote-workflow","workflow-launch-exec","reload-skills","rename","security-review","usage","insights","recap","skill-doctor","goal","design","design-consent","design-revoke","list-agents","team-onboarding"],"terminal_slash_commands":["doctor","color"],"apiKeySource":"none","claude_code_version":"2.1.258","output_style":"default","agents":["claude","Explore","general-purpose","Plan","statusline-setup"],"skills":["bailian-cli","bailian-docs-llm-wiki","bailian-finetune","bailian-gen","bailian-managed-agent","bailian-model-recommend","bailian-protocol","bailian-train-deploy","bailian-web-search","deep-research","design-sync","dataviz","update-config","verify","debug","code-review","simplify","batch","fewer-permission-prompts","doctor","loop","claude-api","workflow-authoring","run","run-skill-generator"],"plugins":[],"capabilities":["interrupt_receipt_v1","interrupt_cancel_queued_v1","msg_lifecycle_v1"],"analytics_disabled":false,"product_feedback_disabled":false,"uuid":"cfe8b38f-e90c-49e5-a952-dd5e79d9f615","memory_paths":{"auto":"C:\\Users\\me\\.claude\\projects\\C--Users-me-work-promptbook-experiments-and-landing-pages-aldaron\\memory\\"},"messaging_socket_path":"\\\\.\\pipe\\LOCAL\\cc-msg-0a1d902eac61353fc76ca36596688c1a","fast_mode_state":"off","fast_mode_disabled_reason":"sdk_opt_in_required","powershell_path":"C:\\Program Files\\PowerShell\\7\\pwsh.exe"}
{"type":"system","subtype":"status","status":"requesting","session_id":"f48b319e-933e-45d6-8762-95e561e31476","uuid":"ac7bfbd8-0006-44c1-bc2e-530b6d26423f"}
{"type":"assistant","message":{"diagnostics":null,"id":"fb946d03-5c77-4830-8896-19d1d5be148c","container":null,"model":"<synthetic>","role":"assistant","stop_details":null,"stop_reason":"stop_sequence","stop_sequence":"","type":"message","usage":{"output_tokens_details":null,"input_tokens":0,"output_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":null,"cache_creation":{"ephemeral_1h_input_tokens":0,"ephemeral_5m_input_tokens":0},"inference_geo":null,"iterations":null,"speed":null},"content":[{"type":"text","text":"Failed to authenticate: OAuth session expired and could not be refreshed"}],"context_management":null},"parent_tool_use_id":null,"session_id":"f48b319e-933e-45d6-8762-95e561e31476","uuid":"be433680-21a2-42a5-9389-855520099d4d","timestamp":"2026-09-09T15:32:19.742Z","error":"authentication_failed","is_api_error_message":true}
{"duration_api_ms":0,"stop_reason":"stop_sequence","session_id":"f48b319e-933e-45d6-8762-95e561e31476","total_cost_usd":0,"usage":{"output_tokens_details":{"thinking_tokens":0},"input_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":0,"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":0,"ephemeral_5m_input_tokens":0},"inference_geo":"","iterations":[],"speed":"standard"},"modelUsage":{},"permission_denials":[],"terminal_reason":"api_error","fast_mode_state":"off","fast_mode_disabled_reason":"sdk_opt_in_required","subagent_stats":{"spawned":0,"requested":{"background":0,"foreground":0,"unset":0},"started_in_background":0,"max_depth":0,"spawned_by_subagents":0,"completed":0,"failed":0,"killed":{"parent":0,"user":0,"system":0},"refused":{"depth_limit":0,"concurrency_limit":0,"budget":0},"by_type":{}},"is_error":true,"num_turns":1,"subtype":"success","api_error_status":null,"result":"Failed to authenticate: OAuth session expired and could not be refreshed","type":"result","duration_ms":347,"uuid":"2ea58f5c-82f9-4ac5-a2de-fc0e97a9e7bd","queued_turn_count":0}
    at ChildProcess.handleExit (C:\Users\me\work\promptbook-experiments-and-landing-pages\aldaron\node_modules\@promptbook\cli\umd\index.umd.js:25242:33)
    at ChildProcess.emit (node:events:519:28)
    at maybeClose (node:internal/child_process:1101:16)
    at ChildProcess._handle.onexit (node:internal/child_process:304:5)
```

-   Handle the case when the harness is not logged in or the OAuth session has expired.
-   Display a clear and user-friendly error message guiding the user to re-authenticate.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
