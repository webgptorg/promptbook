// Deterministic fake installed harness: consume real process arguments and the complete conversation on stdin.
const CONVERSATION = require(process.env.PTBK_PLANNER_TEST_FIXTURE);
const ARGUMENTS = process.argv.slice(2);
const OUTPUT_SCHEMA_PATH = ARGUMENTS[ARGUMENTS.indexOf('--output-schema') + 1];
const REQUIRED_DISABLED_FEATURES = [
    'shell_tool',
    'unified_exec',
    'multi_agent',
    'multi_agent_v2',
    'plugins',
    'apps',
    'hooks',
    'code_mode',
    'code_mode_host',
    'workspace_dependencies',
];
if (
    !ARGUMENTS.includes('--ignore-user-config') ||
    !ARGUMENTS.includes('--ignore-rules') ||
    !ARGUMENTS.includes('read-only') ||
    REQUIRED_DISABLED_FEATURES.some((feature) => ARGUMENTS[ARGUMENTS.indexOf(feature) - 1] !== '--disable') ||
    !ARGUMENTS.includes('mcp_servers={}')
) {
    process.stderr.write('Missing planning execution boundary');
    process.exit(2);
}
if (
    !ARGUMENTS.includes('--output-schema') ||
    !JSON.parse(require('fs').readFileSync(OUTPUT_SCHEMA_PATH, 'utf-8')).properties.proposals
) {
    process.stderr.write('Missing structured planning response schema');
    process.exit(2);
}
let prompt = '';
process.stdin.on('data', (chunk) => {
    prompt += chunk;
});
process.stdin.on('end', () => {
    const messages = JSON.parse(prompt.split('Conversation (JSON data):\n')[1]);
    const userMessage = messages.filter((message) => message.role === 'user').at(-1).content;
    const entry = CONVERSATION.find((entry) => entry.user === userMessage);
    if (entry.failure) {
        process.stdout.write(JSON.stringify({ type: 'turn.failed', error: { message: entry.failure } }) + '\n');
        process.exitCode = 1;
        return;
    }
    const isAfterRead = messages.at(-1).role === 'context' && entry.afterRead;
    const firstPath = prompt.match(/prompts\/\d{4}-\d{2}-\d+-csv-exports\.md/)?.[0];
    const response = JSON.stringify(isAfterRead ? entry.afterRead : entry.reply).replace(/\{\{first\}\}/g, firstPath);
    process.stdout.write(
        JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: response } }) + '\n',
    );
    process.stdout.write(JSON.stringify({ type: 'turn.completed' }) + '\n');
});
