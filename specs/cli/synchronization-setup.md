# Synchronization setup during initialization

[Main specification](../_main.md) · [Initialization](initialization.md) · [Git synchronization](git-synchronization.md)

Init has one **Automatic synchronization** decision, default off. Reuse an existing explicit choice during reinit. Choosing no saves `isAutoSync: false` and asks no provider, remote or repository-publication questions. It does not modify an existing origin or perform remote publication. Migrating an existing project does not introduce a surprise wizard or enable synchronization.

When the user chooses yes, save the opt-in and offer:

- **GitHub:** create/publish the new project through supported authenticated GitHub setup, with **private** visibility by default. Public is an explicit optional choice, never inferred from the local folder or inherited accidentally. Resolve the owner and repository name and reuse available authorized authentication; show what will be created before publication. Do not overwrite an existing repository or assume a name collision is permission to use it.
- **Another Git origin:** accept the user's supplied remote URL. The engine later uses ordinary Git transport/authentication; this is not an integration-specific repository-creation wizard. Dedicated GitLab and other hosting setup is future scope, not required now.

Where a project already has a configured remote/tracking destination, offer explicit reuse rather than silently replacing it or forcing a duplicate GitHub repository. Changes to existing remote configuration require the user's clear choice. Remote URL/authentication material must be redacted in status and not copied into `ptbk.json`; actual remote/upstream metadata lives in Git.

A newly created Git repository uses `main`. Existing repositories keep their current branch/history. Configure origin and its tracking destination for the selected initialized branch as part of this explicitly authorized setup, not as recurring engine behavior. Do not put remote/branch selectors into the saved project configuration.

Prepare and commit the authorized local setup before initial publication, respecting secret/ignore rules and selected trace/video policies. Never publish `.env`, native accounts, browser profiles or other ignored secret state, and do not sweep unrelated user files into the initial commit. Out-of-the-box GitHub publication is a real setup operation with an observed result, not merely printing instructions while claiming success.

Remote setup/push failures are separate from usable local initialization: retain the confirmed opt-in and actionable pending/error state, report that publication did not succeed, and start otherwise ready local work. Do not pretend a repository was created or change to public visibility to bypass an error. A later retry must reuse a repository already successfully created for this operation, not create duplicates. Genuinely missing publication choices/authentication remain explicit, with no invisible unattended prompt.

Noninteractive initialization accepts equivalent opt-in/provider/visibility/origin decisions. Off requires no extra fields; GitHub publication requires its resolvable owner/name and authorization; custom-origin setup requires the supplied URL. `--no-commit` and autosync are incompatible and are diagnosed before publication or setup writes. Existing Git authentication remains under the user's normal controls.

## Acceptance outcomes

Default/no skips provider questions and all publication. Yes/GitHub creates and publishes the intended private repository; only an explicit public choice changes visibility. Yes/custom origin configures the supplied destination without GitHub-only assumptions. Preserve an existing branch/remote on reinit. Simulate name collisions, denied authentication, repository creation followed by push failure and offline startup: retain honest recoverable remote state without duplicating repositories, leaking secrets or unnecessarily blocking local tasks.
