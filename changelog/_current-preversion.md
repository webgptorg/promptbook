-   Removed npm installation deprecation warnings by upgrading ESLint from 8 to 10 and refreshing the lockfile.
    Migrated to flat configuration, preserving custom rules and file overrides, and installed the previously
    missing TypeScript lint dependencies and runtime global definitions.
    Updated the declared Node.js requirement to match ESLint 10 (20.19+, 22.13+, or 24+).
-   Replaced the former multi-package publishing pipeline with the single `ptbk` CLI package,
    versioned as the pre-minor prerelease `0.115.0-0`. Added compiled executable packaging,
    release/version validation, npm prerelease tags, release-triggered GitHub publication,
    macOS/Linux CI, external local/global installation checks, and post-publication registry
    version, dist-tag, artifact integrity and executable verification. Node 22.13+ is required.
-   Implemented the coder task engine with legacy Markdown and task Books, strict scheduling,
    recurrence, deterministic migration, project initialization and authoring, safe Git/check
    phase persistence, recovery journals, harness adapters, agent context and TEAM tools,
    read-only planning, human verification, and a protected loopback persistent dashboard.
    Read-only previews report blocked/future tasks without initializing or calling models.
    Restored legacy trace filenames while preserving immutable occurrence records and exact
    finalization outcomes in journals. This prerelease refuses Qwen/Cline TEAM before inference;
    they require an agent without TEAM. OpenCode TEAM requires an explicit qualified model.
-   Codex account inference now requires either an advertised provider credit-prohibition
    capability or explicit `--allow-credits`. Current Codex versions without that capability
    are refused before inference, including accounts with remaining included usage. Account
    and API authentication are forced explicitly; generated scripts never opt into credits.
