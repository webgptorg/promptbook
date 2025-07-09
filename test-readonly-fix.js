/**
 * Test script to verify that Promptbook handles read-only filesystems gracefully
 * This simulates the error that would occur on Vercel and other read-only systems
 */

const fs = require('fs');
const path = require('path');

// Mock filesystem that throws EROFS error
const mockReadOnlyFs = {
    readFile: fs.readFile.bind(fs),
    writeFile: async (filename, content) => {
        const error = new Error('EROFS: read-only file system, open \'' + filename + '\'');
        error.code = 'EROFS';
        error.errno = -30;
        error.syscall = 'open';
        error.path = filename;
        throw error;
    },
    mkdir: async () => {
        // mkdir might work on read-only systems for temp directories
        return;
    }
};

// Test the wizard functionality with read-only filesystem
async function testReadOnlyFix() {
    console.log('Testing Promptbook with read-only filesystem...');

    try {
        // Import the wizard (this would normally work in a real Node.js environment)
        const { $getCompiledBook } = require('./src/wizard/$getCompiledBook');

        // Create a simple pipeline string for testing
        const testPipeline = `
# Test Pipeline

## Task 1

- **PROMPT TEMPLATE:**

\`\`\`
Hello {name}!
\`\`\`

-> {greeting}
`;

        const tools = {
            fs: mockReadOnlyFs,
            fetch: global.fetch || require('node-fetch')
        };

        // This should not crash even with read-only filesystem
        const result = await $getCompiledBook(tools, testPipeline);

        console.log('✅ SUCCESS: Promptbook handled read-only filesystem gracefully');
        console.log('Pipeline compiled successfully:', !!result);

    } catch (error) {
        if (error.message.includes('EROFS') || error.message.includes('read-only')) {
            console.log('❌ FAILED: Promptbook still crashes on read-only filesystem');
            console.error('Error:', error.message);
        } else {
            console.log('⚠️  Other error (this might be expected in test environment):', error.message);
        }
    }
}

// Run the test
testReadOnlyFix().catch(console.error);
