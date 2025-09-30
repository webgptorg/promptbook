import { describe, expect, it } from '@jest/globals';
import { parseUnsupportedParameterError } from './removeUnsupportedModelRequirements';

describe('parseUnsupportedParameterError', () => {
    describe('Unsupported value pattern', () => {
        it('should parse "Unsupported value" error message with single quotes', () => {
            const errorMessage = "Unsupported value: 'temperature' does not support this operation";
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBe('temperature');
        });

        it('should parse "Unsupported value" error message case insensitively', () => {
            const errorMessage = "UNSUPPORTED VALUE: 'max_tokens' DOES NOT SUPPORT this operation";
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBe('max_tokens');
        });

        it('should parse "Unsupported value" error message with extra whitespace', () => {
            const errorMessage = "Unsupported value:   'seed'   does not support   this model";
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBe('seed');
        });
    });

    describe('Parameter type pattern', () => {
        it('should parse parameter type error message', () => {
            const errorMessage = "'temperature' of type number is not supported with this model";
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBe('temperature');
        });

        it('should parse parameter type error message case insensitively', () => {
            const errorMessage = "'MAX_TOKENS' OF TYPE INTEGER IS NOT SUPPORTED WITH THIS MODEL";
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBe('MAX_TOKENS');
        });

        it('should parse parameter type error message with complex type description', () => {
            const errorMessage = "'seed' of type optional integer is not supported with this model version";
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBe('seed');
        });
    });

    describe('Edge cases', () => {
        it('should return null for empty string', () => {
            const result = parseUnsupportedParameterError('');
            expect(result).toBeNull();
        });

        it('should return null for unrelated error message', () => {
            const errorMessage = 'Invalid API key provided';
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBeNull();
        });

        it('should return null for partial matches', () => {
            const errorMessage = 'Unsupported value but no parameter specified';
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBeNull();
        });

        it('should return null for malformed error message', () => {
            const errorMessage = "'temperature does not support"; // Missing closing quote
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBeNull();
        });

        it('should handle error message with no quotes', () => {
            const errorMessage = 'Unsupported value: temperature does not support this operation';
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBeNull();
        });
    });

    describe('Real-world error message examples', () => {
        it('should parse typical OpenAI unsupported parameter error', () => {
            const errorMessage = "Unsupported value: 'seed' does not support deterministic generation for this model";
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBe('seed');
        });

        it('should parse typical model compatibility error', () => {
            const errorMessage = "'max_tokens' of type integer is not supported with this model variant";
            const result = parseUnsupportedParameterError(errorMessage);
            expect(result).toBe('max_tokens');
        });
    });
});
