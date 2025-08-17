export class TestEnvironment {
    private originalEnv: NodeJS.ProcessEnv;
    private envVars: Map<string, string | undefined>;

    constructor() {
        this.originalEnv = { ...process.env };
        this.envVars = new Map();
    }

    public setEnv(key: string, value: string): void {
        this.envVars.set(key, value);
        process.env[key] = value;
    }

    public unsetEnv(key: string): void {
        this.envVars.set(key, undefined);
        delete process.env[key];
    }

    public getEnv(key: string): string | undefined {
        return process.env[key];
    }

    public reset(): void {
        // Restore original environment variables
        for (const [key] of this.envVars) {
            if (this.originalEnv[key] !== undefined) {
                process.env[key] = this.originalEnv[key];
            } else {
                delete process.env[key];
            }
        }
        this.envVars.clear();
    }

    public static async withEnv<T>(callback: (env: TestEnvironment) => Promise<T>): Promise<T> {
        const env = new TestEnvironment();
        try {
            return await callback(env);
        } finally {
            env.reset();
        }
    }
}

// Helper function to create a temporary directory for tests
export async function createTempDir(): Promise<string> {
    const os = await import('os');
    const fs = await import('fs/promises');
    const path = await import('path');

    const tempDir = path.join(os.tmpdir(), `promptbook-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
}

// Helper function to clean up a temporary directory
export async function cleanupTempDir(dir: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.rm(dir, { recursive: true, force: true });
}

// Helper function to create a test file
export async function createTestFile(dir: string, filename: string, content: string): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
}

// Helper function to read a test file
export async function readTestFile(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    return fs.readFile(filePath, 'utf-8');
}
