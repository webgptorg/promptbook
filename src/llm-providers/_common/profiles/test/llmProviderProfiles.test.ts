import { MockedEchoLlmExecutionTools } from '../../../mocked/MockedEchoLlmExecutionTools';
import { MultipleLlmExecutionTools } from '../../../_multiple/MultipleLlmExecutionTools';
import { OpenAiExecutionTools } from '../../../openai/OpenAiExecutionTools';
import { RemoteLlmExecutionTools } from '../../../remote/RemoteLlmExecutionTools';
import { LLM_PROVIDER_PROFILES, getLlmProviderProfile } from '../llmProviderProfiles';

describe('LLM Provider Profiles', () => {
    it('should have predefined profiles for all major providers', () => {
        expect(LLM_PROVIDER_PROFILES.OPENAI).toBeDefined();
        expect(LLM_PROVIDER_PROFILES.ANTHROPIC).toBeDefined();
        expect(LLM_PROVIDER_PROFILES.AZURE_OPENAI).toBeDefined();
        expect(LLM_PROVIDER_PROFILES.GOOGLE).toBeDefined();
        expect(LLM_PROVIDER_PROFILES.DEEPSEEK).toBeDefined();
        expect(LLM_PROVIDER_PROFILES.OLLAMA).toBeDefined();
        expect(LLM_PROVIDER_PROFILES.REMOTE).toBeDefined();
        expect(LLM_PROVIDER_PROFILES.MOCKED_ECHO).toBeDefined();
        expect(LLM_PROVIDER_PROFILES.MOCKED_FAKE).toBeDefined();
        expect(LLM_PROVIDER_PROFILES.VERCEL).toBeDefined();
        expect(LLM_PROVIDER_PROFILES.MULTIPLE).toBeDefined();
    });

    it('should have proper structure for each profile', () => {
        const profile = LLM_PROVIDER_PROFILES.OPENAI;

        expect(profile.name).toBe('OPENAI');
        expect(profile.fullname).toBe('OpenAI GPT');
        expect(profile.color).toBe('#10a37f');
        expect('isMe' in profile).toBe(false); // Should not be set for LLM providers
    });

    it('should provide helper function to get profiles', () => {
        const openaiProfile = getLlmProviderProfile('OPENAI');
        expect(openaiProfile).toEqual(LLM_PROVIDER_PROFILES.OPENAI);
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
                llmToolsConfiguration: []
            },
        });

        expect(remoteTools.profile).toBeDefined();
        expect(remoteTools.profile.name).toBe('REMOTE');
        expect(remoteTools.profile.fullname).toBe('Remote Server');
        expect(remoteTools.profile.color).toBe('#6b7280');
        // Test that colors are valid hex colors
        Object.values(LLM_PROVIDER_PROFILES).forEach((profile) => {
            expect(profile.color).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });
});
