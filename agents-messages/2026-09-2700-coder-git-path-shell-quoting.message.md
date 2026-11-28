# Shared Coder Git path quoting permits shell substitution and pathspec expansion

While implementing the Planner write boundary, I found that
[`quoteShellPath`](../scripts/run-codex-prompts/git/commitChanges.ts) uses `JSON.stringify(path)` to build shell
commands. JSON double quotes do not escape shell substitutions such as dollar-parenthesis or backticks. A repository
filename containing those characters can execute a command when passed to the existing commit helper. Bracketed
filenames also remain Git pathspec patterns and may select unrelated paths.

The planning command rejects these filename characters before authoring or committing a PRD, so its write boundary
does not expose this route. The broader shared helper is outside this feature's scope. A follow-up should move Git
execution to argument vectors, use literal pathspecs, and add regression tests covering substitution characters,
Windows environment expansion, spaces, quotes, and bracketed filenames across all authoring commands.
