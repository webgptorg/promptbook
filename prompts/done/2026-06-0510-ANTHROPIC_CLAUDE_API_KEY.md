[x] $0.2706 21 minutes by Claude Code

[✨🖌] Support both `ANTHROPIC_CLAUDE_API_KEY` and `ANTHROPIC_API_KEY`

-   The `ANTHROPIC_CLAUDE_API_KEY` is deprecated but for backward compatibility we keep supporting it
-   If both `ANTHROPIC_CLAUDE_API_KEY` and `ANTHROPIC_API_KEY` are set, `ANTHROPIC_API_KEY` should take precedence
-   Add the changes into the [changelog](changelog/_current-preversion.md)

