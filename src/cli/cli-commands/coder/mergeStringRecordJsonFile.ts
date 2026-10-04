import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../errors/ParseError';
import { readTextFileIfExists } from '../common/projectInitialization';
import type { InitializationStatus } from './boilerplateTemplates';
import { getTypescriptModule } from './getTypescriptModule';

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
    /**
     * Optional project-specific migration of already existing entries before missing defaults are added.
     */
    readonly transformExistingEntries?: (
        existingEntries: Readonly<Record<string, string>>,
    ) => {
        readonly entries: Readonly<Record<string, string>>;
        readonly diagnostics?: ReadonlyArray<string>;
    };
    readonly ensureParentDirectoryPath?: string;
};

/**
 * Result of one additive string-record merge into a JSON file.
 *
 * @private internal utility of `coder init` command
 */
export type MergedStringRecordJsonFile = {
    /**
     * Status describing whether the JSON file had to be created or updated.
     */
    readonly status: InitializationStatus;

    /**
     * Keys which were missing in the JSON file and therefore added by the merge.
     */
    readonly addedEntryKeys: ReadonlyArray<string>;

    /**
     * Keys whose existing values were intentionally migrated by the merge.
     */
    readonly updatedEntryKeys: ReadonlyArray<string>;

    /**
     * Keys intentionally removed by a migration after their callers were checked.
     */
    readonly removedEntryKeys: ReadonlyArray<string>;

    /**
     * Human-readable migration or composition notes for the initialization summary.
     */
    readonly diagnostics: ReadonlyArray<string>;
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
 * Entries which the project already defines are **never** overridden - only missing keys are added,
 * so hand-tuned scripts and settings survive every repeated `ptbk coder init`.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function mergeStringRecordJsonFile({
    projectPath,
    relativeFilePath,
    fieldPath,
    nextEntries,
    transformExistingEntries,
    ensureParentDirectoryPath,
}: MergeStringRecordJsonFileOptions): Promise<MergedStringRecordJsonFile> {
    if (ensureParentDirectoryPath) {
        await mkdir(join(projectPath, ensureParentDirectoryPath), { recursive: true });
    }

    const absoluteFilePath = join(projectPath, relativeFilePath);
    const fileContent = await readTextFileIfExists(absoluteFilePath);
    const formatting = detectJsonFileFormatting(fileContent);
    const jsonObject = fileContent === undefined ? {} : await parseJsonObjectFile(relativeFilePath, fileContent);
    const existingEntries = getStringRecordOrDefault(jsonObject[fieldPath], relativeFilePath, fieldPath);
    const transformedEntries = transformExistingEntries?.(existingEntries) ?? {
        entries: existingEntries,
        diagnostics: [],
    };

    const addedEntryKeys: Array<string> = Object.keys(transformedEntries.entries).filter(
        (entryKey) => !Object.prototype.hasOwnProperty.call(existingEntries, entryKey),
    );
    const updatedEntryKeys: Array<string> = [];
    const removedEntryKeys = Object.keys(existingEntries).filter(
        (entryKey) => !Object.prototype.hasOwnProperty.call(transformedEntries.entries, entryKey),
    );
    const mergedEntries = { ...transformedEntries.entries };
    for (const [entryKey, entryValue] of Object.entries(transformedEntries.entries)) {
        if (
            Object.prototype.hasOwnProperty.call(existingEntries, entryKey) &&
            existingEntries[entryKey] !== entryValue
        ) {
            updatedEntryKeys.push(entryKey);
        }
    }
    for (const [entryKey, entryValue] of Object.entries(nextEntries)) {
        if (Object.prototype.hasOwnProperty.call(mergedEntries, entryKey)) {
            // Note: The project already defines this entry, keep its own value untouched
            continue;
        }

        mergedEntries[entryKey] = entryValue;
        addedEntryKeys.push(entryKey);
    }

    const hasChanges =
        fileContent === undefined ||
        addedEntryKeys.length > 0 ||
        updatedEntryKeys.length > 0 ||
        removedEntryKeys.length > 0;
    if (!hasChanges) {
        return {
            status: 'unchanged',
            addedEntryKeys,
            updatedEntryKeys,
            removedEntryKeys,
            diagnostics: transformedEntries.diagnostics ?? [],
        };
    }

    const nextJsonObject: JsonObject = { ...jsonObject };
    nextJsonObject[fieldPath] = mergedEntries;
    await writeFile(absoluteFilePath, serializeJsonObject(nextJsonObject, formatting), 'utf-8');
    return {
        status: fileContent === undefined ? 'created' : 'updated',
        addedEntryKeys,
        updatedEntryKeys,
        removedEntryKeys,
        diagnostics: transformedEntries.diagnostics ?? [],
    };
}

/**
 * Parses one JSON object file while accepting VS Code style comments and trailing commas.
 */
async function parseJsonObjectFile(relativeFilePath: string, fileContent: string): Promise<JsonObject> {
    if (fileContent.trim() === '') {
        return {};
    }

    const typescript = await getTypescriptModule();
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
