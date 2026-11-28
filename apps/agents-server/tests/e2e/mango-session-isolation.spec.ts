import path from 'path';
import { expect, test, type Page } from 'playwright/test';
import { loginAsAdmin } from './support/auth';

/** Actual generation payload captured at the existing model-service boundary. */
type Assignment = { readonly agentName: string; readonly agentBrief: string };

/** Uses local Monaco assets and mocks only generation, live tests/reviews and fixture uploads. */
async function installWizardFixtures(page: Page): Promise<Assignment[]> {
    const assignments: Assignment[] = [];
    await page.route(/https:\/\/cdn\.jsdelivr\.net\/npm\/monaco-editor@[^/]+\/min\/vs\//, async (route) => {
        const resource = new URL(route.request().url()).pathname.split('/min/vs/')[1]!;
        await route.fulfill({
            path: path.resolve(__dirname, '../../../../node_modules/monaco-editor/min/vs', resource),
        });
    });
    await page.route('**/api/onboarding/book', async (route) => {
        const assignment = route.request().postDataJSON() as Assignment;
        assignments.push(assignment);
        await route.fulfill({ json: { book: `${assignment.agentName}\nGOAL ${assignment.agentBrief}\nCLOSED` } });
    });
    await page.route('**/api/onboarding/test', async (route) => {
        await route.fulfill({ json: { role: 'agent', content: 'Fixture response for current draft' } });
    });
    await page.route('**/api/onboarding/evaluate', async (route) => {
        await route.fulfill({ json: { checks: [{ status: 'ok', text: 'Fixture current-draft review' }] } });
    });
    await page.route('**/api/upload', async (route) => {
        await route.fulfill({
            json: {
                url: 'http://127.0.0.1:54321/a-only-fixture-file.txt',
                pathname: 'fixture',
                size: 12,
                contentType: 'text/plain',
            },
        });
    });
    return assignments;
}

/** Opens manGo through the normal homepage new-agent action, without clearing browser storage. */
async function openNewAgent(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByText('+ Add New Agent', { exact: true }).click();
    await expect(page.getByLabel('Název agenta')).toHaveValue('');
    await expect(page.getByLabel(/Co má agent dělat/)).toHaveValue('');
}

/** Requests the existing AI-generation service with deterministic fixture responses. */
async function generateDraft(page: Page, agentName: string, agentBrief: string): Promise<void> {
    await page.getByLabel('Název agenta').fill(agentName);
    await page.getByLabel(/Co má agent dělat/).fill(agentBrief);
    await page.getByRole('button', { name: 'Vygenerovat book' }).click();
    await expect(page.getByRole('button', { name: 'Pokračovat: Znalosti' })).toBeEnabled();
}

/** Navigates using the real desktop rail. */
async function goToStep(page: Page, label: string): Promise<void> {
    await page
        .locator('aside')
        .getByRole('button', { name: new RegExp(label) })
        .click();
}

/** Saves through the existing server action into the E2E mock database and opens its actual chat route. */
async function saveAndOpenChat(page: Page): Promise<string> {
    await goToStep(page, 'Hotovo');
    await page.getByRole('button', { name: 'Přejít na chat agenta' }).click();
    await expect(page).toHaveURL(/\/agents\/[^/]+\/chat\?chat=new$/);
    return decodeURIComponent(new URL(page.url()).pathname.split('/')[2]!);
}

/** Reads the persisted Book, independently of the wizard's displayed name/list. */
async function readSavedBook(page: Page, agentId: string): Promise<string> {
    // Fixture inspection tolerates a reused HTTP socket being reset. Only this read may retry
    // ECONNRESET; creation and all content assertions still execute exactly once.
    const response = await page.request.get(`/agents/${encodeURIComponent(agentId)}/api/book?recursionLevel=0`, {
        maxRetries: 2,
    });
    expect(response.ok()).toBe(true);
    return response.text();
}

test.describe('manGo session isolation in the browser', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);
        // New-agent settings and persistence use the existing local mock Supabase server.
        // Inspect before writing: the mock database does not enforce the production key constraint.
        const metadataResponse = await page.request.get('/api/metadata');
        expect(metadataResponse.ok()).toBe(true);
        const metadata = (await metadataResponse.json()) as ReadonlyArray<{ readonly key: string }>;
        const isExistingSetting = metadata.some((entry) => entry.key === 'NEW_AGENT_WIZARD');
        const result = await page.request[isExistingSetting ? 'put' : 'post']('/api/metadata', {
            data: { key: 'NEW_AGENT_WIZARD', value: 'MANGO_WIZARD', note: 'manGo deterministic session regression' },
        });
        expect(result.ok()).toBe(true);
        await page.evaluate(() => {
            sessionStorage.setItem('unrelated-draft', 'preserved');
        });
    });

    test('creates A, B and same-name C in one tab with separate payloads, Books, knowledge and saved agents', async ({
        page,
    }) => {
        const assignments = await installWizardFixtures(page);
        await openNewAgent(page);
        await generateDraft(page, 'manGo shared name', 'A-only brief marker');
        const editorInput = page.getByRole('textbox', { name: 'Editor content', exact: true });
        await editorInput.focus();
        await editorInput.press('Control+A');
        await page.keyboard.insertText('manGo shared name\nGOAL A-only manual Book marker\nCLOSED');
        await goToStep(page, 'Znalosti');
        await page.locator('input[type="file"]').setInputFiles({
            name: 'distinguishable.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('A-only fixture file'),
        });
        await expect(page.getByText('Připraveno', { exact: true })).toBeVisible();
        await page.getByLabel(/Nebo přidejte odkaz/).fill('http://127.0.0.1:54321/a-only-link');
        await page.getByRole('button', { name: 'Přidat', exact: true }).click();
        await goToStep(page, 'Test');
        await page.getByRole('tab', { name: 'Konverzace' }).click();
        await page.getByLabel('Testovací zadání pro agenta').fill('A-only test message');
        await page.getByRole('button', { name: 'Odeslat', exact: true }).click();
        await expect(page.getByText('Fixture response for current draft')).toBeVisible();
        await goToStep(page, 'Book');
        await expect(page.locator('.monaco-editor .view-lines')).toContainText('A-only manual Book marker');
        const firstId = await saveAndOpenChat(page);
        const firstSource = await readSavedBook(page, firstId);
        expect(firstSource).toContain('A-only manual Book marker');
        expect(firstSource).toContain('KNOWLEDGE http://127.0.0.1:54321/a-only-link');
        expect(firstSource).toContain('KNOWLEDGE http://127.0.0.1:54321/a-only-fixture-file.txt');

        await openNewAgent(page);
        await generateDraft(page, 'manGo B', 'B-only brief marker');
        await goToStep(page, 'Znalosti');
        await expect(page.getByRole('button', { name: 'Odebrat zdroj' })).toHaveCount(0);
        await goToStep(page, 'Test');
        await page.getByRole('tab', { name: 'Konverzace' }).click();
        await expect(page.getByText('A-only test message')).toHaveCount(0);
        const secondId = await saveAndOpenChat(page);
        expect(secondId).not.toBe(firstId);
        const secondSource = await readSavedBook(page, secondId);
        expect(secondSource).toContain('B-only brief marker');
        expect(secondSource).not.toMatch(/A-only|a-only|KNOWLEDGE/);

        // The header uses the same controller as the homepage action.
        await page
            .getByRole('banner')
            .getByRole('button', { name: /manGo B/ })
            .click();
        await page.getByText('Create new agent', { exact: true }).click();
        await expect(page.getByLabel('Název agenta')).toHaveValue('');
        await generateDraft(page, 'manGo shared name', 'C-only different brief marker');
        const thirdId = await saveAndOpenChat(page);
        expect(new Set([firstId, secondId, thirdId]).size).toBe(3);
        expect(await readSavedBook(page, thirdId)).not.toMatch(/A-only|a-only|B-only|KNOWLEDGE/);
        expect(await readSavedBook(page, firstId)).toBe(firstSource);
        expect(assignments).toEqual([
            { agentName: 'manGo shared name', agentBrief: 'A-only brief marker' },
            { agentName: 'manGo B', agentBrief: 'B-only brief marker' },
            { agentName: 'manGo shared name', agentBrief: 'C-only different brief marker' },
        ]);
        expect(await page.evaluate(() => sessionStorage.getItem('unrelated-draft'))).toBe('preserved');
        expect(await page.evaluate(() => sessionStorage.getItem('onboarding:v2'))).toBeNull();
    });

    for (const isCompleted of [false, true]) {
        test(`ignores a legacy ${isCompleted ? 'completed' : 'unfinished'} snapshot`, async ({ page }) => {
            const assignments = await installWizardFixtures(page);
            await page.evaluate((isSaved) => {
                sessionStorage.setItem(
                    'onboarding:v2',
                    JSON.stringify({
                        agentName: 'A',
                        agentBrief: 'A-only',
                        bookSource: 'A\nGOAL A-only stale Book\nCLOSED',
                        knowledge: [{ kind: 'url', id: 'old', url: 'http://127.0.0.1:54321/a-only', status: 'ready' }],
                        testMessages: [{ id: 'old', role: 'user', content: 'A-only' }],
                        savedAgentId: isSaved ? 'old-agent-a' : null,
                        savedAgentTargetPath: isSaved ? '/agents/old-agent-a/chat' : null,
                    }),
                );
            }, isCompleted);
            await openNewAgent(page);
            await generateDraft(page, 'manGo legacy regression B', 'B-only current description');
            const agentId = await saveAndOpenChat(page);
            expect(agentId).not.toBe('old-agent-a');
            expect(await readSavedBook(page, agentId)).not.toMatch(/A-only|a-only|old-agent-a/);
            expect(assignments).toEqual([
                { agentName: 'manGo legacy regression B', agentBrief: 'B-only current description' },
            ]);
        });
    }

    test('keeps two independently opened tabs separate and abandons a draft on reload', async ({ page, context }) => {
        await installWizardFixtures(page);
        await openNewAgent(page);
        await generateDraft(page, 'Tab A', 'A-only tab brief');
        const secondPage = await context.newPage();
        const secondAssignments = await installWizardFixtures(secondPage);
        await openNewAgent(secondPage);
        await generateDraft(secondPage, 'Tab B', 'B-only tab brief');
        const secondId = await saveAndOpenChat(secondPage);
        expect(await readSavedBook(secondPage, secondId)).not.toMatch(/A-only|Tab A/);
        expect(secondAssignments).toEqual([{ agentName: 'Tab B', agentBrief: 'B-only tab brief' }]);
        await goToStep(page, 'Book');
        await expect(page.locator('.monaco-editor .view-lines')).toContainText('A-only tab brief');
        await page.reload();
        await page.getByText('+ Add New Agent', { exact: true }).click();
        await expect(page.getByLabel('Název agenta')).toHaveValue('');
        await expect(page.getByLabel(/Co má agent dělat/)).toHaveValue('');
        await secondPage.close();
    });
});
