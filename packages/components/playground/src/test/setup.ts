import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

// Global test setup
beforeAll(() => {
    // Setup any global test utilities here
});

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Global cleanup
afterAll(() => {
    // Clean up any global resources
});
