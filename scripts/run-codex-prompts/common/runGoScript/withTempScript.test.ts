import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolvePromptbookTempPath } from '../../../../src/utils/files/getPromptbookTempPath';
import { withTempScript } from './withTempScript';

describe('withTempScript', () => {
    let temporaryDirectoryPath: string;

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-temp-script-'));
    });

    afterEach(async () => {
        await rm(temporaryDirectoryPath, { recursive: true, force: true });
    });

    it('creates missing parent directories before writing the temporary script', async () => {
        const scriptPath = resolvePromptbookTempPath(temporaryDirectoryPath, 'scripts', 'agent-messages', 'message-0001.sh');

        await withTempScript(
            {
                scriptPath,
                scriptContent: 'echo "Hello from agent message"',
            },
            async (providedScriptPath) => {
                expect(providedScriptPath).toBe(scriptPath);
                await expect(readFile(scriptPath, 'utf-8')).resolves.toBe('echo "Hello from agent message"');
            },
        );

        await expect(stat(scriptPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
