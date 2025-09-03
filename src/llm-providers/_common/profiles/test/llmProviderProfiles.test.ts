import { MockedEchoLlmExecutionTools } from '../../../mocked/MockedEchoLlmExecutionTools';
import { MultipleLlmExecutionTools } from '../../../_multiple/MultipleLlmExecutionTools';
import { OpenAiExecutionTools } from '../../../openai/OpenAiExecutionTools';
import { RemoteLlmExecutionTools } from '../../../remote/RemoteLlmExecutionTools';
import { OPENAI_PROFILE } from '../../../openai/openai-profile';
import { ANTHROPIC_CLAUDE_PROFILE } from '../../../anthropic-claude/anthropic-claude-profile';
import { AZURE_OPENAI_PROFILE } from '../../../azure-openai/azure-openai-profile';
import { GOOGLE_PROFILE } from '../../../google/google-profile';
import { DEEPSEEK_PROFILE } from '../../../deepseek/deepseek-profile';
import { OLLAMA_PROFILE } from '../../../ollama/ollama-profile';
import { REMOTE_PROFILE } from '../../../remote/remote-profile';
import { MOCKED_ECHO_PROFILE, MOCKED_FAKE_PROFILE } from '../../../mocked/mocked-profiles';
import { VERCEL_PROFILE } from '../../../vercel/vercel-profile';
import { MULTIPLE_PROFILE } from '../../../_multiple/multiple-profile';

describe('LLM Provider Profiles', () => {
    it('should have predefined profiles for all major providers', () => {
        expect(OPENAI_PROFILE).toBeDefined();
        expect(ANTHROPIC_CLAUDE_PROFILE).toBeDefined();
        expect(AZURE_OPENAI_PROFILE).toBeDefined();
        expect(GOOGLE_PROFILE).toBeDefined();
        expect(DEEPSEEK_PROFILE).toBeDefined();
        expect(OLLAMA_PROFILE).toBeDefined();
        expect(REMOTE_PROFILE).toBeDefined();
        expect(MOCKED_ECHO_PROFILE).toBeDefined();
        expect(MOCKED_FAKE_PROFILE).toBeDefined();
        expect(VERCEL_PROFILE).toBeDefined();
        expect(MULTIPLE_PROFILE).toBeDefined();
    });

    it('should have proper structure for each profile', () => {
        const profile = OPENAI_PROFILE;

        expect(profile.name).toBe('OPENAI');
        expect(profile.fullname).toBe('OpenAI GPT');
        expect(profile.color).toBe('#10a37f');
        expect('isMe' in profile).toBe(false); // Should not be set for LLM providers
    });

    it('should have profile property in OpenAI execution tools', () => {
        const openaiTools = new OpenAiExecutionTools({ apiKey: 'test-key' });

        expect(openaiTools.profile).toBeDefined();
        expect(openaiTools.profile.name).toBe('OPENAI');
        expect(openaiTools.profile.fullname).toBe('OpenAI GPT');
        expect(openaiTools.profile.color).toBe('#10a37f');
    });

    it('should have profile property in MockedEcho execution tools', () => {
        const mockedTools = new MockedEchoLlmExecutionTools();

        expect(mockedTools.profile).toBeDefined();
        expect(mockedTools.profile.name).toBe('MOCKED_ECHO');
        expect(mockedTools.profile.fullname).toBe('Echo (Test)');
        expect(mockedTools.profile.color).toBe('#8b5cf6');
    });

    it('should have profile property in Multiple execution tools', () => {
        const openaiTools = new OpenAiExecutionTools({ apiKey: 'test-key' });
        const mockedTools = new MockedEchoLlmExecutionTools();
        const multipleTools = new MultipleLlmExecutionTools(openaiTools, mockedTools);

        expect(multipleTools.profile).toBeDefined();
        expect(multipleTools.profile.name).toBe('MULTIPLE');
        expect(multipleTools.profile.fullname).toBe('Multiple Providers');
        expect(multipleTools.profile.color).toBe('#6366f1');
    });

    it('should have profile property in Remote execution tools', () => {
        const remoteTools = new RemoteLlmExecutionTools({
            remoteServerUrl: 'http://localhost:3000',
            identification: {
                isAnonymous: true,
                llmToolsConfiguration: [],
            },
        });

        expect(remoteTools.profile).toBeDefined();
        expect(remoteTools.profile.name).toBe('REMOTE');
        expect(remoteTools.profile.fullname).toBe('Remote Server');
        expect(remoteTools.profile.color).toBe('#6b7280');
    });

    it('should have valid hex colors for all profiles', () => {
        const profiles = [
            OPENAI_PROFILE,
            ANTHROPIC_CLAUDE_PROFILE,
            AZURE_OPENAI_PROFILE,
            GOOGLE_PROFILE,
            DEEPSEEK_PROFILE,
            OLLAMA_PROFILE,
            REMOTE_PROFILE,
            MOCKED_ECHO_PROFILE,
            MOCKED_FAKE_PROFILE,
            VERCEL_PROFILE,
            MULTIPLE_PROFILE,
        ];

        profiles.forEach((profile) => {
            expect(profile.color).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });
});
