import { parseRunBrowserToolResult, resolveRunBrowserArtifactUrl } from './toolCallParsing';

describe('toolCallParsing run_browser helpers', () => {
    it('parses embedded run_browser JSON payload from markdown', () => {
        const result = parseRunBrowserToolResult(`
# Browser run completed

\`\`\`json
{
  "schema": "promptbook/run-browser@1",
  "sessionId": "agents-server-run-browser-000",
  "mode": "local",
  "initialUrl": "https://example.com",
  "finalUrl": "https://example.com/final",
  "finalTitle": "Final title",
  "executedActions": [
    { "type": "navigate", "url": "https://example.com/final" },
    { "type": "click", "selector": "#submit" }
  ],
  "artifacts": [
    {
      "kind": "screenshot",
      "label": "Initial page",
      "path": ".playwright-cli/agents-server-run-browser-000-initial.png",
      "actionSummary": "Navigate to https://example.com/final"
    }
  ]
}
\`\`\`
        `);

        expect(result).toMatchObject({
            sessionId: 'agents-server-run-browser-000',
            mode: 'local',
            initialUrl: 'https://example.com',
            finalUrl: 'https://example.com/final',
            finalTitle: 'Final title',
        });
        expect(result?.artifacts).toHaveLength(1);
        expect(result?.actions).toHaveLength(2);
        expect(result?.actions[0]?.summary).toBe('Navigate to https://example.com/final');
        expect(result?.actions[1]?.summary).toBe('Click #submit');
    });

    it('parses legacy markdown run_browser output', () => {
        const result = parseRunBrowserToolResult(`
# Browser run completed

**Session:** agents-server-run-browser-111
**Mode:** local-browser
**Initial URL:** https://example.com

## Final page

- URL: https://example.com/final
- Title: Example

## Final snapshot

.playwright-cli/agents-server-run-browser-111.png

## Action log

- 1. {"type":"wait","milliseconds":250}
- 2. {"type":"click","selector":"#submit"}
        `);

        expect(result?.sessionId).toBe('agents-server-run-browser-111');
        expect(result?.artifacts[0]?.path).toBe('.playwright-cli/agents-server-run-browser-111.png');
        expect(result?.actions.map((action) => action.summary)).toEqual(['Wait 250ms', 'Click #submit']);
    });

    it('maps local artifact paths to browser-artifacts API urls', () => {
        expect(resolveRunBrowserArtifactUrl('.playwright-cli/agents-server-run-browser-abc.png')).toBe(
            '/api/browser-artifacts/agents-server-run-browser-abc.png',
        );
    });

    it('keeps absolute artifact URLs unchanged', () => {
        expect(resolveRunBrowserArtifactUrl('https://cdn.example.com/browsers/run.webm')).toBe(
            'https://cdn.example.com/browsers/run.webm',
        );
    });
});
