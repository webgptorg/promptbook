import { MockFileSystem } from './mockFileSystem';
import { MockLlmClient } from './mockLlmClient';
import { cleanupTempDir, createTempDir, TestEnvironment } from './testEnvironment';

export interface IntegrationTestContext {
    mockLlm: MockLlmClient;
    mockFs: MockFileSystem;
    env: TestEnvironment;
    tempDir: string;
}

export async function setupIntegrationTest(): Promise<IntegrationTestContext> {
    const mockLlm = new MockLlmClient();
    const mockFs = new MockFileSystem();
    const env = new TestEnvironment();
    const tempDir = await createTempDir();

    // Set up default environment variables
    env.setEnv('NODE_ENV', 'test');
    env.setEnv('OPENAI_API_KEY', 'test-key');

    return {
        mockLlm,
        mockFs,
        env,
        tempDir,
    };
}

export async function teardownIntegrationTest(context: IntegrationTestContext): Promise<void> {
    // Clean up environment
    context.env.reset();

    // Clean up temporary directory
    await cleanupTempDir(context.tempDir);

    // Reset mock filesystem
    context.mockFs.reset();
}

// Helper function to run a test with a clean environment
export async function withTestEnvironment<T>(callback: (context: IntegrationTestContext) => Promise<T>): Promise<T> {
    const context = await setupIntegrationTest();
    try {
        return await callback(context);
    } finally {
        await teardownIntegrationTest(context);
    }
}
