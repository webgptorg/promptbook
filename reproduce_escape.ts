const PROMPT_PARAMETER_ESCAPE_WITH_BRACES_PATTERN = /[{}$`]/g;

function escapePromptParameterValue(value: string): string {
    return value.replace(PROMPT_PARAMETER_ESCAPE_WITH_BRACES_PATTERN, '\\$&');
}

const payload = '`rm -rf` {danger} $HOME';
const escaped = escapePromptParameterValue(payload);
const json = JSON.stringify(escaped);

console.log('Original:', payload);
console.log('Escaped:', escaped);
console.log('JSON:', json);

const expectedInTest = '\\\\`rm -rf\\\\` \\\\{danger\\\\} \\\\$HOME';
console.log('Expected in test:', expectedInTest);

if (json === `"${expectedInTest}"`) {
    console.log('MATCH!');
} else {
    console.log('NO MATCH');
    console.log('JSON content:    ', json.slice(1, -1));
    console.log('Expected content:', expectedInTest);
}
