import type { ManGoNewAgentWizardCreateRequest } from '../ManGoNewAgentWizard';
import type { ManGoCreatedAgentPayload } from '../components/steps/DoneStep';
import { createId } from '../lib/id';
import { evaluateReply } from '../services/agentEvalService';
import { agentTestService } from '../services/agentTestService';
import { generateBook } from '../services/bookService';
import { createManGoAgentSource } from '../services/createManGoAgentSource';
import { uploadKnowledgeFile } from '../services/uploadService';
import type { ChatMessage, KnowledgeFileItem } from '../types';
import type { OnboardingSession } from './createOnboardingSession';
import { runOnboardingOperation } from './runOnboardingOperation';

/** Creation service supplied by the existing shared new-agent controller. */
type CreateAgent = (request: ManGoNewAgentWizardCreateRequest) => Promise<ManGoCreatedAgentPayload>;

/**
 * Session-owned actions shared by the step UI. They read the latest draft at invocation,
 * and no async callback retains permission to update a replacement draft or superseded request.
 */
export function createOnboardingActions(session: OnboardingSession) {
    /** Generates through the existing model service; manual edits/input changes supersede its result. */
    async function generate(): Promise<void> {
        const state = session.getState();
        if (!state.agentName.trim() || !state.agentBrief.trim()) {
            return;
        }
        const operation = session.beginOperation('book');
        if (!operation) {
            return;
        }
        const assignment = { agentName: state.agentName, agentBrief: state.agentBrief };
        session.update({ bookGeneration: { phase: 'generating', error: null } });
        await runOnboardingOperation(
            operation,
            (signal) => generateBook(assignment, signal),
            (bookSource) =>
                session.update({
                    bookSource,
                    bookAssignment: assignment,
                    bookGeneration: { phase: 'ready', error: null },
                }),
            (error) =>
                session.update({
                    bookGeneration: {
                        phase: 'error',
                        error: error instanceof Error ? error.message : 'Generování booku selhalo.',
                    },
                }),
        );
    }

    /** Keeps concurrent uploads independent, including uploads finishing after step navigation. */
    async function uploadFile(file: File): Promise<void> {
        const id = createId();
        const operation = session.beginOperation(`upload:${id}`);
        if (!operation) {
            return;
        }
        const item: KnowledgeFileItem = {
            kind: 'file',
            id,
            name: file.name,
            size: file.size,
            publicUrl: '',
            objectKey: '',
            status: 'uploading',
        };
        session.update((previous) => ({ knowledge: [...previous.knowledge, item] }));
        await runOnboardingOperation(
            operation,
            (signal) => uploadKnowledgeFile(file, signal),
            ({ publicUrl, objectKey }) =>
                session.update((previous) => ({
                    knowledge: previous.knowledge.map((entry) =>
                        entry.id === id ? { ...entry, publicUrl, objectKey, status: 'ready' } : entry,
                    ),
                })),
            () =>
                session.update((previous) => ({
                    knowledge: previous.knowledge.map((entry) =>
                        entry.id === id ? { ...entry, status: 'error' } : entry,
                    ),
                })),
        );
    }

    /** Removes the association and cancels its pending upload; saved agents' objects are untouched. */
    function removeKnowledge(id: string): void {
        session.cancelOperation(`upload:${id}`);
        session.update((previous) => ({ knowledge: previous.knowledge.filter((item) => item.id !== id) }));
    }

    /** Runs a conversation revision with only this draft's source, ready knowledge and messages. */
    async function runChat(history: readonly ChatMessage[]): Promise<void> {
        const operation = session.beginOperation('chat');
        if (!operation) {
            return;
        }
        const state = session.getState();
        session.update({ testMessages: history, isSendingTestMessage: true });
        await runOnboardingOperation(
            operation,
            (signal) =>
                agentTestService.send(
                    { bookSource: state.bookSource, knowledge: state.knowledge, messages: history },
                    signal,
                ),
            (reply) =>
                session.update((previous) => ({
                    testMessages: [...previous.testMessages, { id: createId(), role: 'agent', content: reply.content }],
                })),
            () =>
                session.update((previous) => ({
                    testMessages: [
                        ...previous.testMessages,
                        {
                            id: createId(),
                            role: 'agent',
                            content: 'Omlouvám se, něco se pokazilo. Zkuste to prosím znovu.',
                        },
                    ],
                })),
            () => session.update({ isSendingTestMessage: false }),
        );
    }

    /** Sends one deliberate test message, guarding duplicate clicks synchronously. */
    function sendTestMessage(text: string): void {
        const state = session.getState();
        if (!text.trim() || state.isSendingTestMessage) {
            return;
        }
        void runChat([...state.testMessages, { id: createId(), role: 'user', content: text.trim() }]);
    }

    /** Retries the last user turn while retaining the current draft's conversation. */
    function retryTestMessage(): void {
        const state = session.getState();
        if (state.isSendingTestMessage) {
            return;
        }
        const lastUserIndex = state.testMessages.map((message) => message.role).lastIndexOf('user');
        if (lastUserIndex >= 0) {
            void runChat(state.testMessages.slice(0, lastUserIndex + 1));
        }
    }

    /** Stops both network work and acceptance of an already running response. */
    function stopTestMessage(): void {
        session.cancelOperation('chat');
        session.update({ isSendingTestMessage: false });
    }

    /** Runs email generation and evaluation as one revision, preserving results across step navigation. */
    async function runEmailTest(): Promise<void> {
        const state = session.getState();
        if (!state.testEmail.trim() || state.emailTest.phase === 'running') {
            return;
        }
        const operation = session.beginOperation('email');
        if (!operation) {
            return;
        }
        const customerEmail = state.testEmail.trim();
        session.update({ emailTest: { phase: 'running', reply: '', error: null, checks: null, isEvaluating: false } });
        await runOnboardingOperation(
            operation,
            async (signal) => {
                const reply = await agentTestService.send(
                    {
                        bookSource: state.bookSource,
                        knowledge: state.knowledge,
                        messages: [{ id: createId(), role: 'user', content: customerEmail }],
                    },
                    signal,
                );
                if (!operation.isCurrent()) {
                    return;
                }
                session.update({
                    emailTest: { phase: 'done', reply: reply.content, error: null, checks: null, isEvaluating: true },
                });
                try {
                    const checks = await evaluateReply(
                        { bookSource: state.bookSource, customerEmail, reply: reply.content },
                        signal,
                    );
                    if (operation.isCurrent()) {
                        session.update((previous) => ({ emailTest: { ...previous.emailTest, checks } }));
                    }
                } catch {
                    if (operation.isCurrent()) {
                        session.update((previous) => ({ emailTest: { ...previous.emailTest, checks: [] } }));
                    }
                }
            },
            () => undefined,
            (error) =>
                session.update((previous) => ({
                    emailTest: {
                        ...previous.emailTest,
                        phase: 'error',
                        error: error instanceof Error ? error.message : 'Testovací běh selhal.',
                    },
                })),
            () => session.update((previous) => ({ emailTest: { ...previous.emailTest, isEvaluating: false } })),
        );
    }

    /**
     * Saves once per draft even across remounts/effect re-execution. A failed draft requires an
     * explicit retry. Server success remains associated with this operation even after cancellation.
     */
    async function createAgent(
        onCreate: CreateAgent,
        visibility: ManGoNewAgentWizardCreateRequest['visibility'],
        isRetry = false,
    ): Promise<void> {
        const state = session.getState();
        if (
            state.savedAgentId ||
            session.isOperationPending('creation') ||
            (state.creationError && !isRetry) ||
            (!state.agentName.trim() && !state.bookSource.trim())
        ) {
            return;
        }
        const operation = session.beginOperation('creation');
        if (!operation) {
            return;
        }
        session.update({ isCreatingAgent: true, creationError: null });
        try {
            const agent = await onCreate({
                agentSource: createManGoAgentSource(state),
                visibility,
                knowledgeCount: state.knowledge.filter((item) => item.status === 'ready').length,
            });
            session.complete(agent);
        } catch (error) {
            if (operation.isCurrent()) {
                session.update({ creationError: error instanceof Error ? error.message : 'Vytvoření agenta selhalo.' });
            }
        } finally {
            if (operation.isCurrent()) {
                session.update({ isCreatingAgent: false });
            }
            operation.finish();
        }
    }

    return {
        generate,
        uploadFile,
        removeKnowledge,
        sendTestMessage,
        retryTestMessage,
        stopTestMessage,
        runEmailTest,
        createAgent,
    };
}
