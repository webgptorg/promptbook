#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import OpenAI from 'openai';
import { join } from 'path';
import { createInterface } from 'readline';

const ASSISTANTS_PAGE_LIMIT = 100;
const ROOT_DIR = join(__dirname, '../..');

main()
    .catch((error) => {
        const message = formatError(error);
        console.error(colors.bgRed('Delete assistants failed'));
        console.error(colors.red(message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Lightweight metadata for a single assistant listed from the API.
 */
type AssistantSummary = {
    id: string;
    name: string | null;
    model: string;
    createdAt: number;
};

/**
 * Result of a bulk assistant deletion run.
 */
type AssistantDeletionResult = {
    deleted: AssistantSummary[];
    failed: AssistantDeletionFailure[];
};

/**
 * Captures a deletion failure for a specific assistant.
 */
type AssistantDeletionFailure = {
    assistant: AssistantSummary;
    reason: string;
};

/**
 * OpenAI assistant payload used by this script.
 */
type OpenAiAssistantListItem = OpenAI.Beta.Assistant;

/**
 * Orchestrates listing, confirmation, and deletion of OpenAI assistants.
 */
async function main(): Promise<void> {
    ensureRootCwd();

    const apiKey = getOpenAiApiKey();
    const client = new OpenAI({ apiKey });

    const assistants = await listAllAssistants(client);
    console.info(colors.cyan(`Found ${assistants.length} assistant(s).`));

    if (assistants.length === 0) {
        console.info(colors.green('No assistants to delete.'));
        return;
    }

    printAssistantSummary(assistants);

    const confirmed = await promptForConfirmation(`Delete ${assistants.length} assistant(s)? Type "y" to confirm: `);

    if (!confirmed) {
        console.info(colors.yellow('Aborted. No assistants were deleted.'));
        return;
    }

    const result = await deleteAssistants(client, assistants);
    logDeletionSummary(result);
}

/**
 * Ensures the script is executed from the repository root.
 */
function ensureRootCwd(): void {
    if (process.cwd() !== ROOT_DIR) {
        console.error(colors.red('CWD must be root of the project.'));
        process.exit(1);
    }
}

/**
 * Reads the OpenAI API key from the environment.
 */
function getOpenAiApiKey(): string {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not defined in the environment.');
    }
    return apiKey;
}

/**
 * Fetches all assistants from the OpenAI API, following cursor pagination.
 */
async function listAllAssistants(client: OpenAI): Promise<AssistantSummary[]> {
    const summaries: AssistantSummary[] = [];
    const assistantsPage = client.beta.assistants.list({ limit: ASSISTANTS_PAGE_LIMIT });

    for await (const assistant of assistantsPage) {
        summaries.push(mapAssistantToSummary(assistant));
    }

    return summaries;
}

/**
 * Maps the OpenAI assistant payload into the local summary shape.
 */
function mapAssistantToSummary(assistant: OpenAiAssistantListItem): AssistantSummary {
    return {
        id: assistant.id,
        name: assistant.name,
        model: assistant.model,
        createdAt: assistant.created_at,
    };
}

/**
 * Prints a summary list of assistants scheduled for deletion.
 */
function printAssistantSummary(assistants: AssistantSummary[]): void {
    console.info(colors.yellow('Assistants to be deleted:'));
    for (const assistant of assistants) {
        console.info(`- ${formatAssistantSummaryLine(assistant)}`);
    }
}

/**
 * Formats an assistant summary into a single display line.
 */
function formatAssistantSummaryLine(assistant: AssistantSummary): string {
    const name = assistant.name?.trim() || '(unnamed)';
    const createdAt = new Date(assistant.createdAt * 1000).toISOString();
    return `${assistant.id} | ${name} | ${assistant.model} | ${createdAt}`;
}

/**
 * Prompts for a yes/no confirmation using stdin.
 */
async function promptForConfirmation(promptText: string): Promise<boolean> {
    const answer = await askQuestion(promptText);
    const normalized = answer.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes';
}

/**
 * Asks a single question on stdin and resolves with the user response.
 */
async function askQuestion(promptText: string): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(promptText, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Deletes assistants sequentially, logging each deletion outcome.
 */
async function deleteAssistants(client: OpenAI, assistants: AssistantSummary[]): Promise<AssistantDeletionResult> {
    const deleted: AssistantSummary[] = [];
    const failed: AssistantDeletionFailure[] = [];

    for (const assistant of assistants) {
        console.info(colors.gray(`Deleting ${assistant.id}...`));
        try {
            await client.beta.assistants.del(assistant.id);
            console.info(colors.green(`Deleted ${assistant.id}.`));
            deleted.push(assistant);
        } catch (error) {
            const reason = formatError(error);
            console.error(colors.red(`Failed to delete ${assistant.id}: ${reason}`));
            failed.push({ assistant, reason });
        }
    }

    return { deleted, failed };
}

/**
 * Logs a summary of deletion successes and failures.
 */
function logDeletionSummary(result: AssistantDeletionResult): void {
    console.info(colors.cyan(`Deleted ${result.deleted.length} assistant(s).`));

    if (result.failed.length > 0) {
        console.info(colors.red(`Failed to delete ${result.failed.length} assistant(s):`));
        for (const failure of result.failed) {
            console.info(`- ${failure.assistant.id}: ${failure.reason}`);
        }
    }
}

/**
 * Formats unknown errors into a readable message.
 */
function formatError(error: unknown): string {
    if (error instanceof Error) {
        return error.stack || error.message;
    }
    return String(error);
}
