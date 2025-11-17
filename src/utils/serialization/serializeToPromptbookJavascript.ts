import spaceTrim from 'spacetrim';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { string_javascript } from '../../types/typeAliases';
import { Color } from '../color/Color';
import type { TODO_any } from '../organization/TODO_any';

type SerializeToPromptbookJavascriptReturn = {
    /**
     * Array of import statements required for the `value` to work
     */
    readonly imports: ReadonlyArray<string_javascript>;

    /**
     * The serialized value as a string of JavaScript code
     */
    readonly value: string_javascript;
};

/**
 * Function `serializeToPromptbookJavascript` will serialize a value to a javascript representation using `@promptbook/*` entities where possible.
 *
 * @public exported from `@promptbook/utils`
 */
export function serializeToPromptbookJavascript(value: TODO_any): SerializeToPromptbookJavascriptReturn {
    let serializedValue: string_javascript;
    let imports: string_javascript[] = [];

    if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') {
        serializedValue = JSON.stringify(value, null, 4);
    } else if (Array.isArray(value)) {
        const serializedItems = value.map((item) => serializeToPromptbookJavascript(item));
        serializedValue = `[${serializedItems.map((item) => item.value).join(', ')}]`;
        imports = serializedItems.flatMap((item) => item.imports);
    } else if (value instanceof Date) {
        serializedValue = `new Date('${value.toISOString()}')`;
    } else if (value instanceof Color) {
        serializedValue = `Color.fromHex('${value.toHex()}')`;
        imports.push(`import { Color } from '@promptbook/color';`);
    } else if (typeof value === 'string') {
        const trimmed = spaceTrim(value);
        if (trimmed.includes('\n')) {
            // Multiline string -> use `spaceTrim`
            serializedValue = `spaceTrim(\`\n${value.replace(/`/g, '\\`')}\n\`)`;
            imports.push(`import { spaceTrim } from '@promptbook/utils';`);
        } else if (Color.isHexColorString(trimmed)) {
            return serializeToPromptbookJavascript(Color.fromHex(trimmed));
        } else {
            // Single line string -> use normal quotes
            serializedValue = JSON.stringify(value);
        }
    } else if (typeof value === 'object') {
        const entries = Object.entries(value).map(([key, val]) => {
            const serializedEntry = serializeToPromptbookJavascript(val);
            imports.push(...serializedEntry.imports);
            return [key, serializedEntry.value];
        });

        const objectString = `{\n${entries
            .map(
                ([key, val]) =>
                    `    ${JSON.stringify(key)}: ${val
                        ?.split('\n')
                        .map((line) => `    ${line}`)
                        .join('\n')}`,
            )
            .join(',\n')}\n}`;
        serializedValue = objectString;
    } else {
        throw new Error(`Cannot serialize to Promptbook Javascript value of type "${typeof value}"`);
    }

    if (serializedValue === undefined) {
        throw new UnexpectedError(`Serialization resulted in undefined value`);
    }

    const uniqueImports = Array.from(new Set(imports)).filter((imp) => !!imp && imp.trim().length > 0);

    return { imports: uniqueImports, value: serializedValue };
}

/**
 * TODO: Dynamic indentation passable through options in a second argument
 */
