/** @jest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { useNewAgentDialog } from '../useNewAgentDialog';
import {
    $createAgentFromBookAction,
    $getNewAgentCreationSettingsAction,
    $generateAgentBoilerplateAction,
} from '../../../app/actions';
import { bookEditorUploadHandler } from '../../../utils/upload/createBookEditorUploadHandler';
import type { OnboardingDraftState } from './types';
import type { useOnboarding } from './state/OnboardingProvider';
import { validateBook } from '../../../../../../src/book-2.0/agent-source/string_book';

/** Captured ownership-bound controls allow exercising callbacks retained by an unmounted step. */
let mockCurrentOnboarding: ReturnType<typeof useOnboarding>;
/** Navigation spy replaces only the browser location API. */
const mockNavigate = jest.fn();
/** Optional controller notifications under test. */
const mockOnCreated = jest.fn();
/** Optional controller failure notification under test. */
const mockOnCreateFailed = jest.fn();
/** Retained classic-editor callbacks model a delayed dirty close or pending submission. */
let mockCurrentEditor: { onClose: () => void; onCreate: (source: string) => void };

jest.mock('../../../app/actions', () => ({
    $createAgentFromBookAction: jest.fn(),
    $getNewAgentCreationSettingsAction: jest.fn(),
    $generateAgentBoilerplateAction: jest.fn(),
}));
jest.mock('../../_utils/headlessParam', () => ({
    useIsHeadless: () => false,
    appendHeadlessParam: (path: string) => {
        mockNavigate(path);
        return '#mocked-navigation';
    },
}));
jest.mock('../trackNewAgentCreationEvent', () => ({ trackNewAgentCreationEvent: jest.fn() }));
jest.mock('../NewAgentWizard', () => ({ NewAgentWizard: () => <div>Classic wizard</div> }));
jest.mock('../NewAgentDialog', () => ({
    NewAgentDialog: ({
        initialAgentSource,
        onClose,
        onCreate,
    }: {
        initialAgentSource: string;
        onClose: () => void;
        onCreate: (source: string) => void;
    }) => {
        mockCurrentEditor = { onClose, onCreate };
        return (
            <div>
                <output data-testid="classic-source">{initialAgentSource}</output>
                <button onClick={() => onCreate(initialAgentSource)}>Classic save</button>
            </div>
        );
    },
}));
jest.mock('../../../utils/upload/createBookEditorUploadHandler', () => ({ bookEditorUploadHandler: jest.fn() }));
jest.mock('./components/WizardShell', () => {
    const actual = jest.requireActual<typeof import('./components/WizardShell')>('./components/WizardShell');
    const { useOnboarding: readOnboarding } = jest.requireActual('./state/OnboardingProvider');
    return {
        ...actual,
        WizardShell: (props: Parameters<typeof actual.WizardShell>[0]) => {
            mockCurrentOnboarding = readOnboarding();
            return (
                <>
                    <output data-testid="draft-state">{JSON.stringify(mockCurrentOnboarding.state)}</output>
                    <actual.WizardShell {...props} />
                </>
            );
        },
    };
});
jest.mock('../../../../../../src/book-components/BookEditor/BookEditor', () => ({
    BookEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
        <textarea aria-label="Book source" value={value} onChange={(event) => onChange(event.target.value)} />
    ),
}));

/** Actual shared controller and manGo UI with only external services/editor mocked. */
function NewAgentHost({ creationScope, folderId = 42 }: { creationScope?: string; folderId?: number }) {
    const { openNewAgentDialog, closeNewAgentDialog, dialog } = useNewAgentDialog({
        creationScope,
        onCreated: mockOnCreated,
        onCreateFailed: mockOnCreateFailed,
    });
    const [isVisible, setIsVisible] = useState(true);
    return (
        <>
            <button onClick={() => void openNewAgentDialog({ folderId })}>New agent</button>
            <button onClick={closeNewAgentDialog}>Host close</button>
            <button onClick={() => setIsVisible((previous) => !previous)}>Remount provider</button>
            {isVisible && dialog}
        </>
    );
}

/** Reads the actual provider's complete draft, including invisible payload/error state. */
function readDraft(): OnboardingDraftState {
    return JSON.parse(screen.getByTestId('draft-state').textContent || '{}');
}

/** Deterministic async work that intentionally ignores cancellation. */
function createDeferred<Result>() {
    let resolve!: (result: Result) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<Result>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

/** Creates a fetch result without invoking a real model or network. */
function jsonResponse(payload: unknown): Response {
    return { ok: true, json: async () => payload } as Response;
}

/** Navigates through the real rail, which has mobile and desktop instances. */
function goToStep(label: string) {
    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(label) }).find((button) => button.closest('ol'))!);
}

/** Waits for the actual generated editor content. */
async function expectBook(marker: string) {
    await waitFor(() => expect((screen.getByLabelText('Book source') as HTMLTextAreaElement).value).toContain(marker));
}

/** Adds a distinguishable link through the real knowledge UI. */
function addLink(url: string) {
    fireEvent.change(screen.getByLabelText(/Nebo přidejte odkaz/), { target: { value: url } });
    fireEvent.click(screen.getByRole('button', { name: /Přidat$/ }));
}

/** Selects local fixture files through the actual upload input. */
function selectFiles(...names: string[]) {
    fireEvent.change(document.querySelector('input[type="file"]')!, {
        target: { files: names.map((name) => new File([name], name, { type: 'text/plain' })) },
    });
}

/** Sends a unique user message through the conversation tab. */
function sendChat(message: string) {
    fireEvent.click(screen.getByRole('tab', { name: /Konverzace/ }));
    fireEvent.change(screen.getByLabelText('Testovací zadání pro agenta'), { target: { value: message } });
    fireEvent.click(screen.getByRole('button', { name: 'Odeslat' }));
}

/** Opens a fresh draft through the ordinary controller action. */
async function openDraft() {
    fireEvent.click(screen.getByText('New agent', { exact: true }));
    await screen.findByLabelText('Název agenta');
}

/** Supplies the assignment and explicitly requests its Book. */
function generateDraft(name: string, brief: string) {
    fireEvent.change(screen.getByLabelText('Název agenta'), { target: { value: name } });
    fireEvent.change(screen.getByLabelText(/Co má agent dělat/), { target: { value: brief } });
    fireEvent.click(screen.getByRole('button', { name: /Vygenerovat book/ }));
}

describe('manGo creation session integration', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="portal-root"></div>';
        jest.mocked($getNewAgentCreationSettingsAction).mockResolvedValue({
            mode: 'MANGO_WIZARD',
            defaultVisibility: 'PRIVATE',
        });
        jest.mocked($createAgentFromBookAction).mockResolvedValue({ agentName: 'B', permanentId: 'agent-b' });
        jest.mocked(bookEditorUploadHandler).mockImplementation(async (file) => `https://cdn.example.com/${file.name}`);
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: jest.fn() });
        window.sessionStorage.setItem('unrelated-draft', 'preserve this');
        global.fetch = jest.fn(async (path, options) => {
            const input = JSON.parse(options?.body as string);
            if (path === '/api/onboarding/test')
                return jsonResponse({ role: 'agent', content: `Reply to ${input.messages.at(-1).content}` });
            if (path === '/api/onboarding/evaluate')
                return jsonResponse({ checks: [{ status: 'ok', text: 'Current draft checked' }] });
            return jsonResponse({ book: `${input.agentName}\nGOAL ${input.agentBrief}\nCLOSED` });
        });
    });

    afterEach(() => {
        cleanup();
        jest.restoreAllMocks();
        jest.clearAllMocks();
        window.sessionStorage.removeItem('onboarding:v2');
        expect(window.sessionStorage.getItem('unrelated-draft')).toBe('preserve this');
        window.sessionStorage.removeItem('unrelated-draft');
    });

    it('creates A, B and same-name C with independent Books, knowledge, tests and identities without clearing storage', async () => {
        const agents = new Map<string, string>();
        jest.mocked($createAgentFromBookAction).mockImplementation(async (source) => {
            const permanentId = `saved-${agents.size + 1}`;
            agents.set(permanentId, source);
            return { agentName: source.split('\n')[0], permanentId };
        });
        render(
            <StrictMode>
                <NewAgentHost />
            </StrictMode>,
        );
        await openDraft();
        generateDraft('Shared name', 'A-only brief');
        await expectBook('A-only brief');
        fireEvent.change(screen.getByLabelText('Book source'), {
            target: { value: 'Shared name\nGOAL A-only edited Book\nCLOSED' },
        });
        goToStep('Znalosti');
        addLink('https://example.com/a-only');
        selectFiles('a-only.txt');
        await waitFor(() => expect(readDraft().knowledge.every((item) => item.status === 'ready')).toBe(true));
        goToStep('Test');
        sendChat('A-only test message');
        await waitFor(() => expect(readDraft().testMessages).toHaveLength(2));
        goToStep('Book');
        await expectBook('A-only edited Book');
        goToStep('Znalosti');
        expect(readDraft().knowledge).toHaveLength(2);
        goToStep('Hotovo');
        await waitFor(() => expect(readDraft().savedAgentId).toBe('saved-1'));
        const savedA = agents.get('saved-1');
        expect(savedA).toContain('KNOWLEDGE https://example.com/a-only');
        expect(savedA).toContain('KNOWLEDGE https://cdn.example.com/a-only.txt');
        fireEvent.click(screen.getByRole('button', { name: 'Přejít na chat agenta' }));
        expect(mockNavigate).toHaveBeenCalledWith('/agents/saved-1/chat?chat=new');
        await openDraft();
        expect(readDraft()).toMatchObject({
            agentName: '',
            agentBrief: '',
            bookSource: '',
            knowledge: [],
            testMessages: [],
            savedAgentId: null,
            savedAgentTargetPath: null,
            creationError: null,
            isCreatingAgent: false,
            bookAssignment: null,
            bookGeneration: { phase: 'init', error: null },
            knowledgeUrlInput: '',
            knowledgeUrlError: null,
            testChatInput: '',
            isSendingTestMessage: false,
            emailTest: { phase: 'idle', reply: '', error: null, checks: null, isEvaluating: false },
        });
        generateDraft('B', 'B-only brief');
        await expectBook('B-only brief');
        goToStep('Test');
        sendChat('B-only test message');
        await waitFor(() => expect(readDraft().testMessages).toHaveLength(2));
        const testRequest = jest
            .mocked(fetch)
            .mock.calls.filter(([path]) => path === '/api/onboarding/test')
            .at(-1)!;
        expect(JSON.parse(testRequest[1]!.body as string)).toEqual({
            bookSource: 'B\nGOAL B-only brief\nCLOSED',
            knowledge: [],
            messages: [{ role: 'user', content: 'B-only test message' }],
        });
        goToStep('Hotovo');
        await waitFor(() => expect(readDraft().savedAgentId).toBe('saved-2'));
        expect(agents.get('saved-2')).not.toMatch(/A-only|a-only|KNOWLEDGE/);
        expect(readDraft().savedAgentTargetPath).toBe('/agents/saved-2/chat?chat=new');
        fireEvent.click(screen.getByRole('button', { name: 'Začít nový onboarding' }));
        expect(readDraft().knowledge).toEqual([]);
        expect(readDraft().savedAgentId).toBeNull();
        generateDraft('Shared name', 'C-only different brief');
        await expectBook('C-only different brief');
        goToStep('Hotovo');
        await waitFor(() => expect(readDraft().savedAgentId).toBe('saved-3'));
        expect(agents.get('saved-3')).not.toMatch(/A-only|a-only|B-only|KNOWLEDGE/);
        expect(agents.get('saved-1')).toBe(savedA);
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(3);
        expect(
            jest
                .mocked(fetch)
                .mock.calls.filter(([path]) => path === '/api/onboarding/book')
                .map(([, options]) => JSON.parse(options!.body as string)),
        ).toEqual([
            { agentName: 'Shared name', agentBrief: 'A-only brief' },
            { agentName: 'B', agentBrief: 'B-only brief' },
            { agentName: 'Shared name', agentBrief: 'C-only different brief' },
        ]);
        expect(window.sessionStorage.getItem('onboarding:v2')).toBeNull();
    });

    it.each(['Host close', 'wizard close', 'Escape'])('abandons through %s and reopens cleanly', async (exit) => {
        render(<NewAgentHost />);
        await openDraft();
        generateDraft('A', 'A-only');
        await expectBook('A-only');
        goToStep('Znalosti');
        addLink('https://example.com/a-only');
        if (exit === 'Escape') fireEvent.keyDown(document, { key: 'Escape' });
        else if (exit === 'wizard close')
            fireEvent.click(screen.getAllByRole('button', { name: 'Zavřít průvodce' })[0]);
        else fireEvent.click(screen.getByText('Host close'));
        await openDraft();
        expect(readDraft()).toMatchObject({ agentName: '', bookSource: '', knowledge: [], testMessages: [] });
        expect($createAgentFromBookAction).not.toHaveBeenCalled();
    });

    it.each(['generation', 'upload', 'chat', 'email', 'review', 'creation'])(
        'rejects late %s success and failure from a replaced session',
        async (kind) => {
            for (const isRejection of [false, true]) {
                const deferred = createDeferred<Response>();
                const upload = createDeferred<string>();
                const creation = createDeferred<Awaited<ReturnType<typeof $createAgentFromBookAction>>>();
                const view = render(<NewAgentHost />);
                await openDraft();
                if (kind === 'generation') jest.mocked(fetch).mockReturnValueOnce(deferred.promise);
                generateDraft('A', 'A-only');
                if (kind !== 'generation') {
                    await expectBook('A-only');
                    goToStep('Znalosti');
                    if (kind === 'upload') {
                        jest.mocked(bookEditorUploadHandler).mockReturnValueOnce(upload.promise);
                        selectFiles('shared.txt');
                    } else if (kind === 'creation') {
                        jest.mocked($createAgentFromBookAction).mockReturnValueOnce(creation.promise);
                        goToStep('Hotovo');
                    } else {
                        goToStep('Test');
                        if (kind === 'review') {
                            jest.mocked(fetch)
                                .mockResolvedValueOnce(jsonResponse({ role: 'agent', content: 'A-only reply' }))
                                .mockReturnValueOnce(deferred.promise);
                            fireEvent.click(screen.getByRole('button', { name: /Spustit testovací běh/ }));
                            await waitFor(() => expect(readDraft().emailTest.isEvaluating).toBe(true));
                        } else {
                            jest.mocked(fetch).mockReturnValueOnce(deferred.promise);
                            if (kind === 'chat') sendChat('A-only message');
                            else fireEvent.click(screen.getByRole('button', { name: /Spustit testovací běh/ }));
                        }
                    }
                }
                const previousControls = mockCurrentOnboarding;
                await openDraft();
                generateDraft('B', 'B-only');
                await expectBook('B-only');
                const before = readDraft();
                await act(async () => {
                    previousControls.update({ bookSource: 'Late A-only edit' });
                    previousControls.reset(); // stale reset must not replace B
                    if (kind === 'upload') {
                        if (isRejection) upload.reject(new Error('A-only upload failure'));
                        else upload.resolve('https://example.com/a-only-upload');
                    } else if (kind === 'creation') {
                        if (isRejection) creation.reject(new Error('A-only save failure'));
                        else creation.resolve({ agentName: 'A', permanentId: 'a-late-id' });
                    } else {
                        if (isRejection) deferred.reject(new Error('A-only response failure'));
                        else
                            deferred.resolve(
                                jsonResponse({
                                    book: 'A-only late Book',
                                    content: 'A-only late reply',
                                    checks: [{ status: 'warn', text: 'A-only late review' }],
                                }),
                            );
                    }
                });
                expect(readDraft()).toEqual(before);
                expect(mockNavigate).not.toHaveBeenCalled();
                expect(mockOnCreated).not.toHaveBeenCalled();
                expect(mockOnCreateFailed).not.toHaveBeenCalled();
                expect(window.sessionStorage.getItem('onboarding:v2')).toBeNull();
                view.unmount();
            }
        },
    );

    it('retains pending work through provider remounts and creates once on completion effect replay', async () => {
        const generation = createDeferred<Response>();
        const creation = createDeferred<Awaited<ReturnType<typeof $createAgentFromBookAction>>>();
        jest.mocked(fetch).mockReturnValueOnce(generation.promise);
        render(
            <StrictMode>
                <NewAgentHost />
            </StrictMode>,
        );
        await openDraft();
        generateDraft('A', 'A brief');
        fireEvent.click(screen.getByText('Remount provider'));
        fireEvent.click(screen.getByText('Remount provider'));
        expect(fetch).toHaveBeenCalledTimes(1);
        await act(async () => generation.resolve(jsonResponse({ book: 'A\nGOAL Edited\nCLOSED' })));
        await expectBook('Edited');
        jest.mocked($createAgentFromBookAction).mockReturnValueOnce(creation.promise);
        goToStep('Hotovo');
        fireEvent.click(screen.getByText('Remount provider'));
        fireEvent.click(screen.getByText('Remount provider'));
        goToStep('Book');
        goToStep('Hotovo');
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(1);
        await act(async () => creation.resolve({ agentName: 'A', permanentId: 'saved-a' }));
        goToStep('Book');
        goToStep('Hotovo');
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(1);
        expect(readDraft().savedAgentId).toBe('saved-a');
    });

    it.each([false, true])(
        'keeps manual edits and rejects out-of-order regeneration (rejection: %s)',
        async (isRejection) => {
            render(<NewAgentHost />);
            await openDraft();
            generateDraft('A', 'first brief');
            await expectBook('first brief');
            fireEvent.change(screen.getByLabelText('Book source'), {
                target: { value: 'A\nGOAL Manual edit\nCLOSED' },
            });
            goToStep('Zadání');
            fireEvent.change(screen.getByLabelText(/Co má agent dělat/), { target: { value: 'latest brief' } });
            goToStep('Book');
            await expectBook('Manual edit');
            const older = createDeferred<Response>();
            const newer = createDeferred<Response>();
            jest.mocked(fetch).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
            fireEvent.click(screen.getByTitle('Přegenerovat book ze zadání'));
            goToStep('Zadání');
            fireEvent.click(screen.getByRole('button', { name: /Vygenerovat book/ }));
            await act(async () => newer.resolve(jsonResponse({ book: 'A\nGOAL latest successful revision\nCLOSED' })));
            await expectBook('latest successful revision');
            await act(async () => {
                if (isRejection) older.reject(new Error('Stale generation error'));
                else older.resolve(jsonResponse({ book: 'A\nGOAL stale revision\nCLOSED' }));
            });
            await expectBook('latest successful revision');
            expect(readDraft().bookGeneration).toEqual({ phase: 'ready', error: null });
            expect(
                jest
                    .mocked(fetch)
                    .mock.calls.slice(-2)
                    .map(([, options]) => JSON.parse(options!.body as string)),
            ).toEqual([
                { agentName: 'A', agentBrief: 'latest brief' },
                { agentName: 'A', agentBrief: 'latest brief' },
            ]);
        },
    );

    it('keeps concurrent uploads during navigation and never reattaches a removed pending file', async () => {
        const first = createDeferred<string>();
        const second = createDeferred<string>();
        const removed = createDeferred<string>();
        jest.mocked(bookEditorUploadHandler)
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise)
            .mockReturnValueOnce(removed.promise);
        render(<NewAgentHost />);
        await openDraft();
        generateDraft('A', 'brief');
        await expectBook('brief');
        goToStep('Znalosti');
        selectFiles('first.txt', 'second.txt', 'removed.txt');
        fireEvent.click(screen.getAllByRole('button', { name: 'Odebrat zdroj' })[2]);
        goToStep('Book');
        await act(async () => {
            second.resolve('https://example.com/second');
            first.resolve('https://example.com/first');
            removed.resolve('https://example.com/removed');
        });
        goToStep('Znalosti');
        expect(readDraft().knowledge).toMatchObject([
            { name: 'first.txt', status: 'ready' },
            { name: 'second.txt', status: 'ready' },
        ]);
        expect(
            (jest.mocked(bookEditorUploadHandler).mock.calls[2][1] as { abortSignal: AbortSignal }).abortSignal.aborted,
        ).toBe(true);
        goToStep('Hotovo');
        await waitFor(() => expect(readDraft().savedAgentId).toBe('agent-b'));
        const source = jest.mocked($createAgentFromBookAction).mock.calls[0][0];
        expect(source).toContain('KNOWLEDGE https://example.com/first');
        expect(source).toContain('KNOWLEDGE https://example.com/second');
        expect(source).not.toContain('removed');
    });

    it.each([false, true])(
        'rejects a superseded generation while the latest request is pending (rejection: %s)',
        async (isRejection) => {
            const older = createDeferred<Response>();
            const newer = createDeferred<Response>();
            render(<NewAgentHost />);
            await openDraft();
            generateDraft('Current agent', 'initial brief');
            await expectBook('initial brief');
            jest.mocked(fetch).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
            fireEvent.click(screen.getByTitle('Přegenerovat book ze zadání'));
            goToStep('Zadání');
            fireEvent.change(screen.getByLabelText(/Co má agent dělat/), { target: { value: 'latest changed brief' } });
            // Input changes revoke the pending request without erasing the existing editable Book.
            expect(readDraft().bookSource).toContain('initial brief');
            const olderSignal = jest.mocked(fetch).mock.calls.at(-1)![1]!.signal as AbortSignal;
            expect(olderSignal.aborted).toBe(true);
            fireEvent.click(screen.getByRole('button', { name: /Vygenerovat book/ }));
            await act(async () => {
                if (isRejection) older.reject(new Error('Superseded generation failed'));
                else older.resolve(jsonResponse({ book: 'Stale generated Book' }));
            });
            expect(readDraft().bookGeneration).toEqual({ phase: 'generating', error: null });
            expect(readDraft().bookSource).toContain('initial brief');
            expect(JSON.parse(jest.mocked(fetch).mock.calls.at(-1)![1]!.body as string)).toEqual({
                agentName: 'Current agent',
                agentBrief: 'latest changed brief',
            });
            await act(async () =>
                newer.resolve(jsonResponse({ book: 'Current agent\nGOAL latest changed brief\nCLOSED' })),
            );
            await expectBook('latest changed brief');
        },
    );

    it("uploads a reused filename for B without retaining A's attachment association", async () => {
        jest.mocked(bookEditorUploadHandler)
            .mockResolvedValueOnce('https://example.com/a-only-shared-file')
            .mockResolvedValueOnce('https://example.com/b-only-shared-file');
        render(<NewAgentHost />);
        await openDraft();
        generateDraft('A', 'A-only');
        await expectBook('A-only');
        goToStep('Znalosti');
        selectFiles('shared.txt');
        await waitFor(() => expect(readDraft().knowledge[0].status).toBe('ready'));
        goToStep('Hotovo');
        await waitFor(() => expect(readDraft().savedAgentId).toBe('agent-b'));
        const firstSource = jest.mocked($createAgentFromBookAction).mock.calls[0][0];
        await openDraft();
        generateDraft('B', 'B-only');
        await expectBook('B-only');
        goToStep('Znalosti');
        selectFiles('shared.txt');
        await waitFor(() => expect(readDraft().knowledge[0].status).toBe('ready'));
        goToStep('Hotovo');
        await waitFor(() => expect($createAgentFromBookAction).toHaveBeenCalledTimes(2));
        expect(bookEditorUploadHandler).toHaveBeenCalledTimes(2);
        expect(firstSource).toContain('KNOWLEDGE https://example.com/a-only-shared-file');
        expect(jest.mocked($createAgentFromBookAction).mock.calls[1][0]).toContain(
            'KNOWLEDGE https://example.com/b-only-shared-file',
        );
        expect(jest.mocked($createAgentFromBookAction).mock.calls[1][0]).not.toContain('a-only');
    });

    it('retains generation and save failures for explicit retry without losing the draft or duplicating success', async () => {
        jest.mocked(fetch).mockRejectedValueOnce(new Error('Generation unavailable'));
        jest.mocked($createAgentFromBookAction).mockRejectedValueOnce(new Error('Save unavailable'));
        render(
            <StrictMode>
                <NewAgentHost />
            </StrictMode>,
        );
        await openDraft();
        generateDraft('A', 'current brief');
        await screen.findByText('Generation unavailable');
        fireEvent.click(screen.getByTitle('Přegenerovat book ze zadání'));
        await expectBook('current brief');
        goToStep('Znalosti');
        addLink('https://example.com/current');
        goToStep('Hotovo');
        await screen.findByText('Save unavailable');
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByText('Remount provider'));
        fireEvent.click(screen.getByText('Remount provider'));
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Zkusit uložit znovu' }));
        await waitFor(() => expect(readDraft().savedAgentId).toBe('agent-b'));
        expect(readDraft().knowledge).toHaveLength(1);
        expect(jest.mocked($createAgentFromBookAction).mock.calls[0][0]).toBe(
            jest.mocked($createAgentFromBookAction).mock.calls[1][0],
        );
        goToStep('Book');
        goToStep('Hotovo');
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(2);
    });

    it.each(['corrupt', 'read failure', 'write failure', 'access failure', 'removal failure'])(
        'works with %s storage and preserves unrelated entries',
        async (condition) => {
            window.sessionStorage.setItem('onboarding:v2', '{ corrupt JSON');
            if (condition === 'read failure')
                jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                    throw new Error('Storage read unavailable');
                });
            if (condition === 'write failure')
                jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                    throw new Error('Quota exhausted');
                });
            if (condition === 'access failure')
                jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
                    throw new Error('Storage access unavailable');
                });
            if (condition === 'removal failure')
                jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
                    throw new Error('Storage removal unavailable');
                });
            render(<NewAgentHost />);
            await openDraft();
            generateDraft('B', 'current brief');
            await expectBook('current brief');
            goToStep('Hotovo');
            await waitFor(() => expect(readDraft().savedAgentId).toBe('agent-b'));
            jest.restoreAllMocks();
        },
    );

    it('hands off only the current Book and knowledge to the classic editor, then starts a clean unrelated draft', async () => {
        render(<NewAgentHost />);
        await openDraft();
        generateDraft('A', 'current handoff');
        await expectBook('current handoff');
        goToStep('Znalosti');
        addLink('https://example.com/current-handoff');
        fireEvent.click(screen.getAllByRole('button', { name: 'Otevřít klasický editor booku' })[0]);
        expect(screen.getByTestId('classic-source').textContent).toContain(
            'KNOWLEDGE https://example.com/current-handoff',
        );
        await openDraft();
        expect(readDraft()).toMatchObject({ bookSource: '', knowledge: [], savedAgentId: null });
    });

    it.each([false, true])('ignores an old handoff save/close after B opens (rejection: %s)', async (isRejection) => {
        const creation = createDeferred<Awaited<ReturnType<typeof $createAgentFromBookAction>>>();
        jest.mocked($createAgentFromBookAction).mockReturnValueOnce(creation.promise);
        render(<NewAgentHost />);
        await openDraft();
        generateDraft('A', 'A-only handoff');
        await expectBook('A-only handoff');
        fireEvent.click(screen.getAllByRole('button', { name: 'Otevřít klasický editor booku' })[0]);
        const previousEditor = mockCurrentEditor;
        fireEvent.click(screen.getByText('Classic save'));
        fireEvent.click(screen.getByText('Remount provider'));
        fireEvent.click(screen.getByText('Remount provider'));
        fireEvent.click(screen.getByText('Classic save'));
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(1);
        await openDraft();
        generateDraft('B', 'B-only');
        await expectBook('B-only');
        const before = readDraft();
        await act(async () => {
            previousEditor.onClose();
            previousEditor.onCreate('A-only late submission');
            if (isRejection) creation.reject(new Error('A-only save failure'));
            else creation.resolve({ agentName: 'A', permanentId: 'saved-a' });
        });
        expect(readDraft()).toEqual(before);
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockOnCreated).not.toHaveBeenCalled();
        expect(mockOnCreateFailed).not.toHaveBeenCalled();
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(1);
    });

    it('keeps an in-flight wizard save when handing off and opens its success without another creation', async () => {
        const creation = createDeferred<Awaited<ReturnType<typeof $createAgentFromBookAction>>>();
        jest.mocked($createAgentFromBookAction).mockReturnValueOnce(creation.promise);
        render(<NewAgentHost />);
        await openDraft();
        generateDraft('A', 'current handoff');
        await expectBook('current handoff');
        goToStep('Znalosti');
        addLink('https://example.com/current-handoff');
        goToStep('Hotovo');
        // Completion hides the handoff button, but the rail still allows revisiting the Book
        // while the original server save is pending.
        goToStep('Book');
        fireEvent.click(screen.getAllByRole('button', { name: 'Otevřít klasický editor booku' })[0]);
        fireEvent.click(screen.getByText('Classic save'));
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(1);
        await act(async () => creation.resolve({ agentName: 'A', permanentId: 'saved-a' }));
        fireEvent.click(screen.getByText('Classic save'));
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/agents/saved-a/chat?chat=new');
        expect($createAgentFromBookAction).toHaveBeenCalledWith(
            expect.stringContaining('KNOWLEDGE https://example.com/current-handoff'),
            42,
            'PRIVATE',
        );
    });

    it.each(['WIZARD', 'BOILERPLATE'] as const)('preserves the %s surface selected by the host', async (mode) => {
        jest.mocked($getNewAgentCreationSettingsAction).mockResolvedValue({ mode, defaultVisibility: 'UNLISTED' });
        jest.mocked($generateAgentBoilerplateAction).mockResolvedValue(
            validateBook('Ordinary\nGOAL Existing flow\nCLOSED'),
        );
        render(<NewAgentHost />);
        fireEvent.click(screen.getByText('New agent'));
        await screen.findByText(mode === 'WIZARD' ? 'Classic wizard' : 'Classic save');
        expect(screen.queryByTestId('draft-state')).toBeNull();
    });

    it.each(['server-a:user-b', 'server-b:user-a'])(
        'abandons the old host scope before exposing %s and retains the new defaults',
        async (creationScope) => {
            const pending = createDeferred<Response>();
            jest.mocked(fetch).mockReturnValueOnce(pending.promise);
            const view = render(<NewAgentHost creationScope="server-a:user-a" />);
            await openDraft();
            generateDraft('A', 'A-only');
            const previousControls = mockCurrentOnboarding;
            view.rerender(<NewAgentHost creationScope={creationScope} folderId={7} />);
            expect(screen.queryByRole('dialog')).toBeNull();
            jest.mocked($getNewAgentCreationSettingsAction).mockResolvedValue({
                mode: 'MANGO_WIZARD',
                defaultVisibility: 'UNLISTED',
            });
            await openDraft();
            generateDraft('B', 'B-only');
            await expectBook('B-only');
            await act(async () => {
                pending.resolve(jsonResponse({ book: 'A-only stale scope' }));
                previousControls.reset();
            });
            await expectBook('B-only');
            goToStep('Hotovo');
            await waitFor(() => expect(readDraft().savedAgentId).toBe('agent-b'));
            expect($createAgentFromBookAction).toHaveBeenCalledWith('B\nGOAL B-only\nCLOSED', 7, 'UNLISTED');
            fireEvent.click(screen.getByRole('button', { name: 'Začít nový onboarding' }));
            generateDraft('C', 'C-only');
            await expectBook('C-only');
            goToStep('Hotovo');
            await waitFor(() => expect($createAgentFromBookAction).toHaveBeenCalledTimes(2));
            expect($createAgentFromBookAction).toHaveBeenLastCalledWith('C\nGOAL C-only\nCLOSED', 7, 'UNLISTED');
        },
    );

    it('keeps a known successful save when the host notification fails', async () => {
        mockOnCreated.mockRejectedValueOnce(new Error('Notification failed after success'));
        const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        render(<NewAgentHost />);
        await openDraft();
        generateDraft('A', 'known saved Book');
        await expectBook('known saved Book');
        goToStep('Hotovo');
        await waitFor(() => expect(readDraft().savedAgentId).toBe('agent-b'));
        await waitFor(() => expect(errorLog).toHaveBeenCalled());
        goToStep('Book');
        goToStep('Hotovo');
        expect($createAgentFromBookAction).toHaveBeenCalledTimes(1);
        expect(readDraft().creationError).toBeNull();
        expect(mockOnCreateFailed).not.toHaveBeenCalled();
    });

    it('preserves same-draft email evaluation, unsent inputs and links across repeated navigation', async () => {
        render(<NewAgentHost />);
        await openDraft();
        generateDraft('A', 'brief');
        await expectBook('brief');
        goToStep('Znalosti');
        fireEvent.change(screen.getByLabelText(/Nebo přidejte odkaz/), { target: { value: 'unfinished.example.com' } });
        goToStep('Test');
        fireEvent.change(screen.getByLabelText(/Testovací vstup/), { target: { value: 'Current email input' } });
        fireEvent.click(screen.getByRole('button', { name: /Spustit testovací běh/ }));
        await screen.findByText('Current draft checked');
        fireEvent.click(screen.getByRole('tab', { name: /Konverzace/ }));
        fireEvent.change(screen.getByLabelText('Testovací zadání pro agenta'), {
            target: { value: 'Unsent current message' },
        });
        goToStep('Znalosti');
        expect((screen.getByLabelText(/Nebo přidejte odkaz/) as HTMLInputElement).value).toBe('unfinished.example.com');
        goToStep('Test');
        expect((screen.getByLabelText('Testovací zadání pro agenta') as HTMLInputElement).value).toBe(
            'Unsent current message',
        );
        fireEvent.click(screen.getByRole('tab', { name: /E-mailový test/ }));
        expect((screen.getByLabelText(/Testovací vstup/) as HTMLTextAreaElement).value).toBe('Current email input');
        expect(screen.getByText('Current draft checked')).toBeTruthy();
    });

    it.each([false, true])(
        'ignores a legacy A snapshot (completed: %s) before rendering or generating B',
        async (isCompleted) => {
            window.sessionStorage.setItem(
                'onboarding:v2',
                JSON.stringify({
                    agentName: 'A',
                    agentBrief: 'A-only brief',
                    bookSource: 'A\nGOAL A-only Book\nKNOWLEDGE https://example.com/a\nCLOSED',
                    knowledge: [{ kind: 'url', id: 'a', url: 'https://example.com/a', status: 'ready' }],
                    testMessages: [{ id: 'a', role: 'user', content: 'A-only test' }],
                    savedAgentId: isCompleted ? 'agent-a' : null,
                    savedAgentTargetPath: isCompleted ? '/agents/agent-a/chat?chat=new' : null,
                }),
            );
            render(<NewAgentHost />);
            await openDraft();
            expect((screen.getByLabelText('Název agenta') as HTMLInputElement).value).toBe('');
            expect((screen.getByLabelText(/Co má agent dělat/) as HTMLTextAreaElement).value).toBe('');
            generateDraft('B', 'B-only brief');
            await waitFor(() =>
                expect((screen.getByLabelText('Book source') as HTMLTextAreaElement).value).toContain('B-only brief'),
            );
            expect(fetch).toHaveBeenCalledWith(
                '/api/onboarding/book',
                expect.objectContaining({
                    body: JSON.stringify({ agentName: 'B', agentBrief: 'B-only brief' }),
                }),
            );
            fireEvent.click(screen.getByRole('button', { name: /Pokračovat: Znalosti/ }));
            expect(screen.queryByText('https://example.com/a')).toBeNull();
            fireEvent.click(screen.getByRole('button', { name: /Pokračovat: Test/ }));
            fireEvent.click(screen.getByRole('button', { name: /Uložit první verzi/ }));
            await waitFor(() => expect($createAgentFromBookAction).toHaveBeenCalledTimes(1));
            expect($createAgentFromBookAction).toHaveBeenCalledWith('B\nGOAL B-only brief\nCLOSED', 42, 'PRIVATE');
            await act(async () => {});
        },
    );
});
