/** Quotes one literal argument, including spaces and shell metacharacters, for a generated Bash script. */
export function quoteBashArgument(value: string): string {
    return `'${value.replace(/'/gu, "'\\''")}'`;
}
