import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../errors/ParseError';
import type { InitializationStatus } from './boilerplateTemplates';
import { readTextFileIfExists } from './readTextFileIfExists';

/**
 * Generic JSON object used for standalone coder configuration files.
 */
type JsonObject = Record<string, unknown>;

/**
 * Formatting preserved when rewriting one JSON file.
 */
type JsonFileFormatting = {
    readonly indentation: string;
    readonly newline: string;
};

/**
 * Parameters controlling one string-record merge into a JSON file.
 */
type MergeStringRecordJsonFileOptions = {
    readonly projectPath: string;
    readonly relativeFilePath: string;
    readonly fieldPath: string;
    readonly nextEntries: Readonly<Record<string, string>>;
    readonly ensureParentDirectoryPath?: string;
};

/**
 * Default indentation used when creating new JSON configuration files.
 */
const DEFAULT_JSON_FILE_INDENTATION = '    ';

/**
 * Default newline used when creating new JSON configuration files.
 */
const DEFAULT_JSON_FILE_NEWLINE = '\n';

/**
 * Ensures one JSON object field contains the provided string-record entries.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function mergeStringRecordJsonFile({
    projectPath,
    relativeFilePath,
    fieldPath,
    nextEntries,
    ensureParentDirectoryPath,
}: MergeStringRecordJsonFileOptions): Promise<InitializationStatus> {
    if (ensureParentDirectoryPath) {
        await mkdir(join(projectPath, ensureParentDirectoryPath), { recursive: true });
    }

    const absoluteFilePath = join(projectPath, relativeFilePath);
    const fileContent = await readTextFileIfExists(absoluteFilePath);
    const formatting = detectJsonFileFormatting(fileContent);
    const jsonObject = fileContent === undefined ? {} : await parseJsonObjectFile(relativeFilePath, fileContent);
    const existingEntries = getStringRecordOrDefault(jsonObject[fieldPath], relativeFilePath, fieldPath);

    let hasChanges = fileContent === undefined;
    const mergedEntries = { ...existingEntries };
    for (const [entryKey, entryValue] of Object.entries(nextEntries)) {
        if (mergedEntries[entryKey] !== entryValue) {
            mergedEntries[entryKey] = entryValue;
            hasChanges = true;
        }
    }

    if (!hasChanges) {
        return 'unchanged';
    }

    const nextJsonObject: JsonObject = { ...jsonObject };
    nextJsonObject[fieldPath] = mergedEntries;
    await writeFile(absoluteFilePath, serializeJsonObject(nextJsonObject, formatting), 'utf-8');
    return fileContent === undefined ? 'created' : 'updated';
}

/**
 * Parses one JSON object file while accepting VS Code style comments and trailing commas.
 */
async function parseJsonObjectFile(relativeFilePath: string, fileContent: string): Promise<JsonObject> {
    if (fileContent.trim() === '') {
        return {};
    }

    const typescript = await import('typescript');
    const parsedFile = typescript.parseConfigFileTextToJson(relativeFilePath, fileContent);
    if (parsedFile.error) {
        throw new ParseError(
            spaceTrim(`
                Cannot parse \`${relativeFilePath}\` as JSON.

                ${typescript.flattenDiagnosticMessageText(parsedFile.error.messageText, '\n')}
            `),
        );
    }

    if (!isPlainObject(parsedFile.config)) {
        throw new ParseError(
            spaceTrim(`
                File \`${relativeFilePath}\` must contain one top-level JSON object.
            `),
        );
    }

    return parsedFile.config;
}

/**
 * Reads one JSON object field as a string-to-string record.
 */
function getStringRecordOrDefault(value: unknown, relativeFilePath: string, fieldPath: string): Record<string, string> {
    if (value === undefined) {
        return {};
    }

    if (!isPlainObject(value)) {
        throw new ParseError(
            spaceTrim(`
                File \`${relativeFilePath}\` contains invalid \`${fieldPath}\`.

                Expected \`${fieldPath}\` to be an object with string values.
            `),
        );
    }

    const stringRecord: Record<string, string> = {};
    for (const [key, itemValue] of Object.entries(value)) {
        if (typeof itemValue !== 'string') {
            throw new ParseError(
                spaceTrim(`
                    File \`${relativeFilePath}\` contains invalid \`${fieldPath}.${key}\`.

                    Expected \`${fieldPath}\` to be an object with string values.
                `),
            );
        }

        stringRecord[key] = itemValue;
    }

    return stringRecord;
}

/**
 * Serializes one JSON object using detected or default formatting.
 */
function serializeJsonObject(value: JsonObject, formatting: JsonFileFormatting): string {
    return `${JSON.stringify(value, null, formatting.indentation)}${formatting.newline}`;
}

/**
 * Detects indentation and newline formatting from an existing JSON file.
 */
function detectJsonFileFormatting(fileContent: string | undefined): JsonFileFormatting {
    if (!fileContent) {
        return {
            indentation: DEFAULT_JSON_FILE_INDENTATION,
            newline: DEFAULT_JSON_FILE_NEWLINE,
        };
    }

    const indentationMatch = fileContent.match(/^[ \t]+(?=")/mu);
    return {
        indentation: indentationMatch?.[0] || DEFAULT_JSON_FILE_INDENTATION,
        newline: fileContent.includes('\r\n') ? '\r\n' : '\n',
    };
}

/**
 * Checks whether one parsed JSON value is a plain object.
 */
function isPlainObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Note: [🟡] Code for coder init JSON merging [mergeStringRecordJsonFile](src/cli/cli-commands/coder/mergeStringRecordJsonFile.ts) should never be published outside of `@promptbook/cli`
