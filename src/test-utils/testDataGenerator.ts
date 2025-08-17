import { faker } from '@faker-js/faker';

export interface TestDataOptions {
    minLength?: number;
    maxLength?: number;
    includeSpecialChars?: boolean;
    language?: string;
}

export class TestDataGenerator {
    private static readonly DEFAULT_OPTIONS: TestDataOptions = {
        minLength: 10,
        maxLength: 100,
        includeSpecialChars: true,
        language: 'en',
    };

    public static generateText(options: TestDataOptions = {}): string {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };
        const length = faker.number.int({ min: opts.minLength!, max: opts.maxLength! });
        let text = faker.lorem.paragraphs(1);

        if (opts.includeSpecialChars) {
            text = this.addSpecialChars(text);
        }

        return text.slice(0, length);
    }

    public static generatePrompt(options: TestDataOptions = {}): string {
        const promptTypes = [
            'Translate this text: {text}',
            'Summarize the following: {text}',
            'Analyze this content: {text}',
            'Generate a response to: {text}',
            'Explain the meaning of: {text}',
        ];

        const prompt = faker.helpers.arrayElement(promptTypes);
        const text = this.generateText(options);
        return prompt.replace('{text}', text);
    }

    public static generateFunctionCall(): { name: string; arguments: string } {
        const functions = [
            {
                name: 'translate',
                args: {
                    text: this.generateText(),
                    targetLanguage: faker.helpers.arrayElement(['es', 'fr', 'de', 'it']),
                },
            },
            {
                name: 'calculate',
                args: {
                    operation: faker.helpers.arrayElement(['add', 'subtract', 'multiply', 'divide']),
                    numbers: [faker.number.int(), faker.number.int()],
                },
            },
            {
                name: 'search',
                args: { query: this.generateText(), filters: { date: faker.date.recent().toISOString() } },
            },
        ];

        const func = faker.helpers.arrayElement(functions);
        return {
            name: func.name,
            arguments: JSON.stringify(func.args),
        };
    }

    public static generateEmbedding(): number[] {
        const dimension = 1536; // Common embedding dimension
        return Array.from({ length: dimension }, () => faker.number.float({ min: -1, max: 1 }));
    }

    public static generateTestFiles(dir: string, count: number = 5): Array<{ path: string; content: string }> {
        const files: Array<{ path: string; content: string }> = [];
        for (let i = 0; i < count; i++) {
            const filename = faker.system.fileName();
            const content = this.generateText();
            files.push({ path: `${dir}/${filename}`, content });
        }
        return files;
    }

    private static addSpecialChars(text: string): string {
        const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const positions = new Set<number>();
        const numSpecialChars = faker.number.int({ min: 1, max: 5 });

        while (positions.size < numSpecialChars) {
            positions.add(faker.number.int({ min: 0, max: text.length - 1 }));
        }

        let result = text;
        positions.forEach((pos) => {
            const char = specialChars[faker.number.int({ min: 0, max: specialChars.length - 1 })];
            result = result.slice(0, pos) + char + result.slice(pos + 1);
        });

        return result;
    }
}
