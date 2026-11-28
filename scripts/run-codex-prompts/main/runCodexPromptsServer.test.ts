import type { number_port } from '../../../src/types/number_positive';
import { parseRunOptions } from '../cli/parseRunOptions';
import { startCoderHttpServer } from '../server/runCoderHttpServer';
import { runCodexPrompts } from './runCodexPrompts';
import { runCodexPromptsServer } from './runCodexPromptsServer';

jest.mock('./runCodexPrompts', () => ({ runCodexPrompts: jest.fn() }));
jest.mock('../server/runCoderHttpServer', () => ({ startCoderHttpServer: jest.fn() }));

describe('coder server previews', () => {
    it('uses the shared runner without exposing the mutable HTTP server during a dry-run', async () => {
        const options = parseRunOptions(['--dry-run', '--harness', 'openai-codex']);
        await runCodexPromptsServer({ ...options, port: 4441 as number_port });
        expect(runCodexPrompts).toHaveBeenCalledWith(options);
        expect(startCoderHttpServer).not.toHaveBeenCalled();
    });
});
