import { describe, expect, it } from '@jest/globals';
import { keepUnused } from '../../../utils/organization/keepUnused';
//import { _GoogleRegistration } from '../../google/register-constructor'; // <- Note: [㊗] Registering the provider
import { _OpenAiRegistration } from '../../openai/register-constructor'; // <- Note: [㊗] Registering the provider
import { createLlmToolsFromConfiguration } from './createLlmToolsFromConfiguration';

keepUnused(_OpenAiRegistration);
// keepUnused(_GoogleRegistration);
// <- Note: `GoogleExecutionTools` are not supported in Jest environment

describe('how createLlmToolsFromConfiguration works', () => {
    it('should create LLM configuration', () => {
        expect(() =>
            createLlmToolsFromConfiguration([
                {
                    title: 'Open AI',
                    packageName: '@promptbook/openai',
                    className: 'OpenAiExecutionTools',
                    options: {
                        apiKey: 'sk-xxxxxxfakekey',
                    },
                },
                /*
                {
                    title: 'Google Gemini',
                    packageName: '@promptbook/google',
                    className: 'GoogleExecutionTools',
                    options: { apiKey: 'AIxxxxxxfakekeys' },
                },
                */
            ]),
        ).not.toThrow();
    });
});
