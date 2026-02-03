#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise';
import { basename, extname, join, relative, resolve } from 'path';
import spaceTrim from 'spacetrim';
import type { SourceFile } from 'typescript';
import * as ts from 'typescript';
import { normalizeToKebabCase } from '../../src/_packages/utils.index';
import { assertsError } from '../../src/errors/assertsError';
import { buildPromptFilename, getPromptNumbering } from '../utils/prompts/getPromptNumbering';
import { formatPromptEmojiTag, getFreshPromptEmojiTags } from '../utils/prompts/promptEmojiTags';
import {
    DEFAULT_MAX_LINE_COUNT,
    ENTITY_COUNT_EXTENSIONS,
    GENERATED_CODE_MARKERS,
    LINE_COUNT_EXEMPT_GLOBS,
    LINE_COUNT_LIMITS_BY_EXTENSION,
    MAX_ENTITIES_PER_FILE,
    PROMPTS_DIR_NAME,
    PROMPT_NUMBER_STEP,
    PROMPT_SLUG_MAX_LENGTH,
    PROMPT_SLUG_PREFIX,
    PROMPT_TARGET_LABEL,
    SOURCE_FILE_EXTENSIONS,
    SOURCE_FILE_IGNORE_GLOBS,
    SOURCE_ROOTS,
} from './find-refactor-candidates.constants';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

findRefactorCandidates()
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Details about a file that should be refactored.
 */
type RefactorCandidate = {
    /**
     * Absolute path to the file on disk.
     */
    readonly absolutePath: string;
    /**
     * Repo-relative path used in prompt content.
     */
    readonly relativePath: string;
    /**
     * Reasons that triggered the refactor prompt.
     */
    readonly reasons: ReadonlyArray<string>;
};

/**
 * Orchestrates scanning for refactor candidates and generating prompts.
 */
async function findRefactorCandidates(): Promise<void> {
    console.info(colors.cyan('?? Find refactor candidates'));

    const rootDir = process.cwd();
    const promptsDir = join(rootDir, PROMPTS_DIR_NAME);

    const existingTargets = await loadExistingPromptTargets(promptsDir);
    const lineCountExemptPaths = await buildExemptPathSet(rootDir, LINE_COUNT_EXEMPT_GLOBS);
    const sourceFiles = await listSourceFiles(rootDir);

    const candidates: RefactorCandidate[] = [];

    for (const filePath of sourceFiles) {
        const normalizedPath = normalizeAbsolutePath(filePath);
        const content = await readFile(filePath, 'utf-8');

        if (isGeneratedFile(content)) {
            continue;
        }

        const extension = extname(filePath).toLowerCase();
        const relativePath = normalizeRelativePath(relative(rootDir, filePath));
        const reasons: string[] = [];

        if (!lineCountExemptPaths.has(normalizedPath)) {
            const lineCount = countLines(content);
            const maxLines = getMaxLinesForExtension(extension);
            if (lineCount > maxLines) {
                reasons.push(`lines ${lineCount}/${maxLines}`);
            }
        }

        if (ENTITY_COUNT_EXTENSIONS.includes(extension)) {
            const entityCount = countEntities(content, extension, filePath);
            if (entityCount > MAX_ENTITIES_PER_FILE) {
                reasons.push(`entities ${entityCount}/${MAX_ENTITIES_PER_FILE}`);
            }
        }

        if (reasons.length > 0) {
            candidates.push({
                absolutePath: filePath,
                relativePath,
                reasons,
            });
        }
    }

    if (candidates.length === 0) {
        console.info(colors.green('No refactor candidates found.'));
        return;
    }

    for (const candidate of candidates) {
        console.info(colors.yellow(`${candidate.relativePath} <- ${candidate.reasons.join('; ')}`));
    }

    const candidatesToWrite = candidates.filter((candidate) => !existingTargets.has(candidate.relativePath));
    const alreadyTracked = candidates.length - candidatesToWrite.length;

    if (candidatesToWrite.length === 0) {
        console.info(colors.green('All candidates already have prompts.'));
        return;
    }

    const promptNumbering = await getPromptNumbering({
        promptsDir,
        step: PROMPT_NUMBER_STEP,
        ignoreGlobs: ['**/node_modules/**'],
    });
    const { selectedEmojis } = await getFreshPromptEmojiTags({
        count: candidatesToWrite.length,
        rootDir,
    });

    await mkdir(promptsDir, { recursive: true });

    const createdPrompts: string[] = [];

    for (const [index, candidate] of candidatesToWrite.entries()) {
        const slug = buildPromptSlug(candidate.relativePath);
        const number = promptNumbering.startNumber + index * promptNumbering.step;
        const filename = buildPromptFilename(promptNumbering.datePrefix, number, slug);
        const promptPath = join(promptsDir, filename);
        const emojiTag = formatPromptEmojiTag(selectedEmojis[index]);
        const promptContent = buildPromptContent(candidate, emojiTag);

        await writeFile(promptPath, promptContent, 'utf-8');
        createdPrompts.push(filename);
    }

    console.info(colors.green(`Created ${createdPrompts.length} prompt(s) in ${PROMPTS_DIR_NAME}.`));
    if (alreadyTracked > 0) {
        console.info(colors.gray(`Skipped ${alreadyTracked} candidate(s) with existing prompts.`));
    }
}

/**
 * Builds prompt content for a refactor candidate.
 *
 * @param candidate - Candidate metadata to include.
 * @param emojiTag - Unique emoji tag for the prompt title.
 */
function buildPromptContent(candidate: RefactorCandidate, emojiTag: string): string {
    const fileName = basename(candidate.relativePath);
    const guidanceLines = buildPromptGuidance(candidate);
    return spaceTrim(
        (block) => `

            [ ]

            ${emojiTag} Refactor [\`${fileName}\` file](${candidate.relativePath})

            ${block(guidanceLines.join('\n'))}
        `,
    );
}

/**
 * Builds the refactor guidance section for a prompt.
 */
function buildPromptGuidance(candidate: RefactorCandidate): ReadonlyArray<string> {
    const guidance: string[] = ['- @@@'];
    const counts = extractReasonCounts(candidate.reasons);
    const densityNote = buildDensityNote(counts);

    if (densityNote) {
        guidance.push(`- ${densityNote}`);
    }

    if (counts.lineCount !== null && counts.maxLines !== null) {
        guidance.push(
            `- The file contains excessive lines of code (${counts.lineCount} lines)`,
            `    - Keep in mind the Single Responsibility Principle (SRP)`,
            `    - Consider breaking it down into smaller, focused modules or components.`,
        );
    }

    if (counts.entityCount !== null && counts.maxEntities !== null) {
        guidance.push(
            `- The file defines too many responsibilities (${counts.entityCount} in single file)`,
            `    - Keep in mind the Single Responsibility Principle (SRP)`,
            `    - Consider breaking it down into smaller, focused modules or components.`,
        );
    }

    guidance.push(
        '- Purpose of this refactoring is to improve code maintainability and readability.',
        '- Look at the internal structure, the usage and also surrounding code to understand how to best refactor this file.',
        '- Consider breaking down large functions into smaller, more manageable ones, removing any redundant code, and ensuring that the file adheres to the project coding standards.',
        '- After the refactoring, ensure that (1) `npm run test-name-discrepancies` and (2) `npm run test-package-generation` are passing successfully.',
        '    1. All the things you have moved to new files should correspond the thing in the file with the file name, for example `MyComponent.tsx` should export `MyComponent`.',
        '    2. All the things you have moved to new files but are private things to the outside world should have `@private function of TheMainThing` JSDoc comment.',
        '- Keep in mind DRY *(Do not repeat yourself)* and SOLID principles while refactoring.',
        '- **Do not change the external behavior** of the code. Focus solely on improving the internal structure and organization of the code.',
        // <- TODO: !!!!!!!!!! Is this prompt working as expected?
    );
    // <- TODO: Leverage `spaceTrim` here

    return guidance;
}

/**
 * Extracts line and entity counts from refactor reasons.
 */
function extractReasonCounts(reasons: ReadonlyArray<string>): {
    readonly lineCount: number | null;
    readonly maxLines: number | null;
    readonly entityCount: number | null;
    readonly maxEntities: number | null;
} {
    let lineCount: number | null = null;
    let maxLines: number | null = null;
    let entityCount: number | null = null;
    let maxEntities: number | null = null;

    for (const reason of reasons) {
        const lineMatch = reason.match(/lines\s+(?<count>\d+)\/(?<max>\d+)/i);
        if (lineMatch?.groups) {
            lineCount = Number(lineMatch.groups.count);
            maxLines = Number(lineMatch.groups.max);
            continue;
        }

        const entityMatch = reason.match(/entities\s+(?<count>\d+)\/(?<max>\d+)/i);
        if (entityMatch?.groups) {
            entityCount = Number(entityMatch.groups.count);
            maxEntities = Number(entityMatch.groups.max);
        }
    }

    return {
        lineCount,
        maxLines,
        entityCount,
        maxEntities,
    };
}

/**
 * Builds a summary note about file density based on counts.
 */
function buildDensityNote(counts: {
    readonly lineCount: number | null;
    readonly maxLines: number | null;
    readonly entityCount: number | null;
    readonly maxEntities: number | null;
}): string | null {
    if (counts.lineCount !== null && counts.entityCount !== null) {
        return 'The file mixes multiple concerns, making it harder to follow.';
    }

    if (counts.lineCount !== null) {
        return 'The file is large enough that it is hard to follow.';
    }

    if (counts.entityCount !== null) {
        return 'The file is dense enough that it is hard to follow.';
    }

    return null;
}

/**
 * Creates the prompt slug from a file path while keeping it readable.
 */
function buildPromptSlug(relativePath: string): string {
    const prefixed = `${PROMPT_SLUG_PREFIX}-${normalizeToKebabCase(relativePath) || 'file'}`;
    if (prefixed.length <= PROMPT_SLUG_MAX_LENGTH) {
        return prefixed;
    }

    const hash = hashString(prefixed).slice(0, 6);
    const trimmed = prefixed.slice(0, PROMPT_SLUG_MAX_LENGTH - hash.length - 1).replace(/-+$/g, '');
    return `${trimmed}-${hash}`;
}

/**
 * Collects all repo-relative target paths already referenced in prompts.
 */
async function loadExistingPromptTargets(promptsDir: string): Promise<Set<string>> {
    if (!existsSync(promptsDir)) {
        return new Set();
    }

    const promptFiles = await glob('**/*.md', {
        cwd: promptsDir,
        nodir: true,
    });

    const targets = new Set<string>();
    const targetRegex = new RegExp(
        `^\\s*-\\s+${escapeRegExp(PROMPT_TARGET_LABEL)}:\\s+\\\`(?<path>[^\\\`]+)\\\``,
        'gm',
    );

    for (const promptFile of promptFiles) {
        const content = await readFile(join(promptsDir, promptFile), 'utf-8');
        for (const match of content.matchAll(targetRegex)) {
            const captured = match.groups?.path;
            if (captured) {
                targets.add(normalizeRelativePath(captured));
            }
        }
    }

    return targets;
}

/**
 * Lists all source files to scan based on configured roots and extensions.
 */
async function listSourceFiles(rootDir: string): Promise<ReadonlyArray<string>> {
    const extensions = SOURCE_FILE_EXTENSIONS.map((extension) => extension.replace(/^\./, '')).join(',');
    const extensionGlob = `{${extensions}}`;
    const patterns = [...SOURCE_ROOTS.map((root) => `${root}/**/*.${extensionGlob}`), `*.${extensionGlob}`];

    const files = new Set<string>();

    for (const pattern of patterns) {
        const matches = await glob(pattern, {
            cwd: rootDir,
            ignore: SOURCE_FILE_IGNORE_GLOBS,
            nodir: true,
            absolute: true,
        });

        for (const match of matches) {
            files.add(match);
        }
    }

    return Array.from(files).sort();
}

/**
 * Builds a set of normalized paths exempt from line-count checks.
 */
async function buildExemptPathSet(rootDir: string, patterns: ReadonlyArray<string>): Promise<Set<string>> {
    const exemptPaths = new Set<string>();

    for (const pattern of patterns) {
        const matches = await glob(pattern, {
            cwd: rootDir,
            ignore: SOURCE_FILE_IGNORE_GLOBS,
            nodir: true,
            absolute: true,
        });

        for (const match of matches) {
            exemptPaths.add(normalizeAbsolutePath(match));
        }
    }

    return exemptPaths;
}

/**
 * Determines whether a file is generated by scanning for known markers.
 */
function isGeneratedFile(content: string): boolean {
    return GENERATED_CODE_MARKERS.some((marker) => content.includes(marker));
}

/**
 * Gets the maximum allowed lines for a file extension.
 */
function getMaxLinesForExtension(extension: string): number {
    return LINE_COUNT_LIMITS_BY_EXTENSION[extension] ?? DEFAULT_MAX_LINE_COUNT;
}

/**
 * Counts lines while ignoring a trailing newline.
 */
function countLines(content: string): number {
    if (content.length === 0) {
        return 0;
    }
    const lines = content.split(/\r?\n/);
    return lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
}

/**
 * Counts top-level entities in a source file.
 */
function countEntities(content: string, extension: string, filePath: string): number {
    const scriptKind = getScriptKindForExtension(extension);
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, false, scriptKind);
    return countEntitiesInSourceFile(sourceFile);
}

/**
 * Counts top-level entities in a parsed TypeScript source file.
 */
function countEntitiesInSourceFile(sourceFile: SourceFile): number {
    let count = 0;

    // Only count top-level declarations to avoid inflating with members or nested scopes.
    for (const statement of sourceFile.statements) {
        if (
            ts.isFunctionDeclaration(statement) ||
            ts.isClassDeclaration(statement) ||
            ts.isInterfaceDeclaration(statement) ||
            ts.isTypeAliasDeclaration(statement) ||
            ts.isEnumDeclaration(statement) ||
            ts.isModuleDeclaration(statement)
        ) {
            count += 1;
            continue;
        }

        if (ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                const initializer = declaration.initializer;
                if (
                    initializer &&
                    (ts.isArrowFunction(initializer) ||
                        ts.isFunctionExpression(initializer) ||
                        ts.isClassExpression(initializer))
                ) {
                    count += 1;
                }
            }
        }
    }

    return count;
}

/**
 * Resolves the script kind for a source file extension.
 */
function getScriptKindForExtension(extension: string): ts.ScriptKind {
    if (extension === '.tsx') {
        return ts.ScriptKind.TSX;
    }
    if (extension === '.jsx') {
        return ts.ScriptKind.JSX;
    }
    if (extension === '.js') {
        return ts.ScriptKind.JS;
    }
    return ts.ScriptKind.TS;
}

/**
 * Normalizes a path to use forward slashes.
 */
function normalizeRelativePath(pathValue: string): string {
    const normalized = pathValue.replace(/\\/g, '/');
    return normalized.replace(/^\.\//, '');
}

/**
 * Normalizes an absolute path for consistent comparisons.
 */
function normalizeAbsolutePath(pathValue: string): string {
    const normalized = resolve(pathValue);
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

/**
 * Escapes a string for use in a regular expression literal.
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a short stable hash used for trimmed slugs.
 */
function hashString(value: string): string {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) + hash + value.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
}

/**
 * Note: [?] Code in this file should never be published in any package
 */
