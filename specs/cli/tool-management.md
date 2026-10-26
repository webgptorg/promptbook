# Managing project tools

[Main specification](../_main.md) · [Tools](tools.md) · [Runtime changes](tool-runtime.md) · [Shared logic and DRY](../coding-standards/shared-logic.md)

Initialization, CLI commands and dashboard management use one implementation of tool operations, types, validation, environment editing and persistence. Init exposes only the existing simple browser/harness setup and generates sensible instance names. Later management exposes the full registry without requiring reinitialization or engine restart.

## Command surface

Use `ptbk tool` as a project-scoped command family, with discoverable scoped help and remote-like named-item ergonomics:

| Command | Behavior |
| --- | --- |
| `ptbk tool list` | Ordered inventory, names, types/variants, enabled/usability/in-use state; read-only. |
| `ptbk tool show <name>` | Non-secret configuration and actual diagnostics for one instance; read-only. |
| `ptbk tool add <type> --variant <variant> --name <name>` | Create a typed named instance, with applicable variant-specific options. |
| `ptbk tool modify <name>` | Update supplied fields, leaving unspecified fields intact; explicit rename preserves known references. |
| `ptbk tool enable <name>` | Persist `isEnabled: true`. |
| `ptbk tool disable <name>` | Persist `isEnabled: false`, retaining configuration and credentials. |
| `ptbk tool remove <name>` | Remove the configuration record, with conservative credential-retirement rules. `delete` is an equivalent explicit destructive label/alias. |
| `ptbk tool move <name> --before <other>` or `--after <other>` | Persist ordering without recreating credentials or changing identity. |

Examples:

```sh
ptbk tool add BROWSER --variant CHROME --name work-browser --profile-source PROJECT --is-headless true
ptbk tool add BROWSER --variant CHROME --name personal-browser --profile-source USER_EXISTING --is-headless false
ptbk tool add HARNESS --variant OPENAI_CODEX --name company-api --authentication API_KEY --api-key-env COMPANY_OPENAI_API_KEY
ptbk tool modify work-browser --is-headless false
ptbk tool disable company-api
ptbk tool enable company-api
```

`--profile-path` supplies a CUSTOM path. `--account-profile` selects an adapter-supported native context. `--api-key-env NAME` writes the canonical `${{ env.NAME }}` reference, not the key. Supplying a new key uses concealed input or explicit `--api-key-stdin` with the same safe `.env` editor; never accept a literal secret as an ordinary argv option. Enum flag input is tolerant but saved values are canonical. Do not silently ignore unsupported type/variant options.

Browser runtime restart/kill/test-GitHub-tab actions are defined separately in [browser controls](browser.md). They affect the actual shared profile pool, not configuration removal, and show their all-connected-engine scope.

## Saved operations and confirmations

Every successful state-changing management operation persists and commits its own non-secret changes immediately, including add, modify, reorder, enable, disable and remove. Read-only/no-op/cancelled actions create no commit. A commit failure is pending/failed persistence, not success. These explicit saved-management commands do not have a temporary-settings mode or an uncommitted fallback; diagnose `--no-commit` before writes. Init can batch the same domain operations into its existing setup transaction and follows that workflow's explicitly selected persistence policy.

Enable and disable are primary actions in all interfaces. Permanent removal is visibly secondary and destructive to configuration, not to profile contents, native account stores or environment history. Do not add routine confirmations to every safe change.

Disabling/removing the **last enabled instance of either type** requires a specific confirmation explaining that the engine can remain running but cannot effectively start ordinary new work until another browser/harness is enabled or added. Recompute counts when applying the operation. An interactive management view asks; a noninteractive CLI reports the warning and requires explicit `--yes` acceptance. This confirmation is separate from acknowledging in-use work. It must not technically stop or pause the service, and it must not be auto-undone by Fixer.

## Tool currently in use

If modify/disable/remove affects a tool held by active work, CLI rejects the operation without writes unless `--force` (alias `-F`) is supplied. It prints two concrete alternatives:

1. Repeat the **same tool command** with `--force`: commit the configuration change now, but allow the work already using the old tool/configuration to finish. This is not a process kill.
2. Run the separate **`ptbk stop --force`** (or `-F`) to stop the entire engine, then repeat the original tool command without `--force` after confirmed termination. Stop itself neither changes nor removes tools.

There is no `--force-stop` flag on tool commands. Dashboard confirmation offers the same meanings: save while current work finishes, or invoke the existing global service force-stop control. After stopping, apply/reconfirm the intended configuration operation separately and recheck that it is no longer in use. Never disguise stopping the whole service as deleting one tool. If both last-of-type and in-use protections apply, both acknowledgements are required; `--yes` does not imply `--force`, and `--force` does not waive the last-of-type warning.

## Concurrency and dashboard parity

A second terminal may add a tool while an engine/task is running. Commit just that operation and promptly notify/refresh the engine; the current task can use the new resource without waiting for its own completion. Preserve the active task's changes and unrelated staged content. Task completion must build on the intervening tool commit and must not restore an old configuration snapshot. See [runtime consistency](tool-runtime.md) and [Git persistence](git-persistence.md).

The dashboard shows a compact tools overview and a keyboard-accessible detail/management view using its existing drill-down pattern. It supports the same operations, fields, diagnostics, confirmations and outcomes as CLI, not a separate implementation. API/transport adapters reuse those operations and return redacted state. See [dashboard details](dashboard-details.md).

## Acceptance outcomes

Manage a stopped and running project through CLI and dashboard and verify equivalent scoped commits. Add a browser from a second terminal during a task and use it before task completion. Exercise both in-use alternatives, their exact commands, no mutation on refusal, and separate last-of-type confirmation. Disable/re-enable preserves credentials; removing a shared key's consumer leaves the key active. No-op operations do not commit; failed commits never claim success or sweep task changes into tool history.
