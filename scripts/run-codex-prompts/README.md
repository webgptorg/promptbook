# run-codex-prompts

`run-codex-prompts.ts` drives the Coding Agent workflow. It loads the `prompts/` tasks, runs them through the selected model runner (OpenAI, Gemini, Claude, etc.), and automatically writes, stages, and commits the generated files.

## Agent identity configuration

All commits created by this script are signed with a dedicated agent identity. The helper in `scripts/run-codex-prompts/git/agentGitIdentity.ts` reads the following environment variables, so you can customize the identity per machine:

- `CODING_AGENT_GIT_NAME` – the `user.name` value that will appear on each commit.
- `CODING_AGENT_GIT_EMAIL` – the `user.email` value that will appear on each commit.
- `CODING_AGENT_GPG_KEY_ID` – the GPG key ID used to sign the commit (the key must exist in your local GPG keyring).
- `CODING_AGENT_GPG_PROGRAM` (optional) – override the GPG program if you do not want to use the default `gpg` binary.

Set the values via `.env`, shell variables, or whichever secrets manager you prefer. The script will fail fast if the identity is missing so that commits cannot fall back to the primary user’s configuration.

If you need a fresh agent key, generate it with GPG (for example from a temporary config file: specify `Name-Real`, `Name-Email`, `Key-Type`, `Key-Length`, `%no-protection`, and `%commit`) and set `CODING_AGENT_GPG_KEY_ID` to the new key’s long ID.

You can bootstrap your environment with the “Promptbook Coding Agent” details (name `Promptbook Coding Agent`, email `coding-agent@promptbook.studio`, key ID `13406525ED912F938FEA85AB4046C687298B2382`), then swap them out whenever a different persona makes more sense.
