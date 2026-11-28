import { describe, expect, it } from '@jest/globals';
import { getTranspiledCodeFileMetadata } from './getTranspiledCodeFileMetadata';

describe('getTranspiledCodeFileMetadata', () => {
    it('treats Anthropic Claude SDK exports as JavaScript harnesses', () => {
        expect(getTranspiledCodeFileMetadata('anthropic-claude-sdk')).toEqual({
            language: 'javascript',
            filename: 'agent-harness.mjs',
        });
    });

    it('treats Anthropic Claude Managed exports as JavaScript harnesses', () => {
        expect(getTranspiledCodeFileMetadata('anthropic-claude-managed')).toEqual({
            language: 'javascript',
            filename: 'agent-harness.mjs',
        });
    });

    it('treats AgentOS exports as JavaScript harnesses', () => {
        expect(getTranspiledCodeFileMetadata('agent-os')).toEqual({
            language: 'javascript',
            filename: 'agent-harness.mjs',
        });
    });

    it('treats E2B exports as JavaScript harnesses', () => {
        expect(getTranspiledCodeFileMetadata('e2b')).toEqual({
            language: 'javascript',
            filename: 'agent-harness.mjs',
        });
    });

    it('treats OpenAI Agents SDK exports as JavaScript harnesses', () => {
        expect(getTranspiledCodeFileMetadata('openai-agents')).toEqual({
            language: 'javascript',
            filename: 'agent-harness.mjs',
        });
    });
});
