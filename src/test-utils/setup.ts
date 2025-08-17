import { performance } from 'perf_hooks';
import { TestEnvironment } from './testEnvironment';

// Global test timeout
jest.setTimeout(30000);

// Global test environment
let testEnv: TestEnvironment;

beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
});

afterAll(async () => {
    await testEnv.cleanup();
});

// Performance monitoring
beforeEach(() => {
    performance.mark('test-start');
});

afterEach(() => {
    performance.mark('test-end');
    performance.measure('test-duration', 'test-start', 'test-end');
    const measure = performance.getEntriesByName('test-duration').pop();
    if (measure && measure.duration > 1000) {
        console.warn(`Test took ${measure.duration.toFixed(2)}ms to complete`);
    }
    performance.clearMarks();
    performance.clearMeasures();
});

// Mock console methods
const originalConsole = { ...console };
beforeEach(() => {
    console.warn = jest.fn();
    console.error = jest.fn();
});

afterEach(() => {
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
});

// Global test utilities
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeWithinRange(floor: number, ceiling: number): R;
            toBeValidTokenCount(): R;
        }
    }
}

expect.extend({
    toBeWithinRange(received: number, floor: number, ceiling: number) {
        const pass = received >= floor && received <= ceiling;
        return {
            message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
            pass,
        };
    },
    toBeValidTokenCount(received: number) {
        const pass = Number.isInteger(received) && received > 0;
        return {
            message: () => `expected ${received} to be a valid token count`,
            pass,
        };
    },
});
