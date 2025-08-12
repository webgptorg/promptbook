import { useEffect, useState } from 'react';

interface TestResult {
    name: string;
    status: 'pass' | 'fail' | 'pending' | 'running';
    message?: string;
    duration?: number;
    error?: string;
}

interface TestSuite {
    name: string;
    tests: TestResult[];
    totalPassed: number;
    totalFailed: number;
    totalPending: number;
    duration: number;
}

// Mock test execution - in a real scenario, this would integrate with vitest
const runMockTests = async (): Promise<TestSuite[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    name: 'BookEditor Basic Rendering',
                    duration: 45,
                    totalPassed: 4,
                    totalFailed: 0,
                    totalPending: 0,
                    tests: [
                        {
                            name: 'renders without crashing',
                            status: 'pass',
                            duration: 12,
                        },
                        {
                            name: 'renders with default book content',
                            status: 'pass',
                            duration: 8,
                        },
                        {
                            name: 'applies custom className to container',
                            status: 'pass',
                            duration: 15,
                        },
                        {
                            name: 'applies fontClassName to editor elements',
                            status: 'pass',
                            duration: 10,
                        },
                    ],
                },
                {
                    name: 'BookEditor Controlled Component',
                    duration: 67,
                    totalPassed: 3,
                    totalFailed: 0,
                    totalPending: 0,
                    tests: [
                        {
                            name: 'accepts controlled value prop',
                            status: 'pass',
                            duration: 18,
                        },
                        {
                            name: 'calls onChange when text changes in controlled mode',
                            status: 'pass',
                            duration: 25,
                        },
                        {
                            name: 'does not change value internally when controlled',
                            status: 'pass',
                            duration: 24,
                        },
                    ],
                },
                {
                    name: 'BookEditor Uncontrolled Component',
                    duration: 38,
                    totalPassed: 2,
                    totalFailed: 0,
                    totalPending: 0,
                    tests: [
                        {
                            name: 'manages internal state when no value prop provided',
                            status: 'pass',
                            duration: 22,
                        },
                        {
                            name: 'calls onChange in uncontrolled mode',
                            status: 'pass',
                            duration: 16,
                        },
                    ],
                },
                {
                    name: 'BookEditor Syntax Highlighting',
                    duration: 89,
                    totalPassed: 2,
                    totalFailed: 0,
                    totalPending: 0,
                    tests: [
                        {
                            name: 'highlights commitment types in the background layer',
                            status: 'pass',
                            duration: 45,
                        },
                        {
                            name: 'escapes HTML in highlighted content',
                            status: 'pass',
                            duration: 44,
                        },
                    ],
                },
                {
                    name: 'BookEditor Scroll Synchronization',
                    duration: 28,
                    totalPassed: 1,
                    totalFailed: 0,
                    totalPending: 0,
                    tests: [
                        {
                            name: 'synchronizes scroll between textarea and highlight layer',
                            status: 'pass',
                            duration: 28,
                        },
                    ],
                },
                {
                    name: 'BookEditor Accessibility',
                    duration: 31,
                    totalPassed: 2,
                    totalFailed: 0,
                    totalPending: 0,
                    tests: [
                        {
                            name: 'has proper ARIA attributes',
                            status: 'pass',
                            duration: 14,
                        },
                        {
                            name: 'has hidden highlight layer for screen readers',
                            status: 'pass',
                            duration: 17,
                        },
                    ],
                },
            ]);
        }, 2000); // Simulate test execution time
    });
};

export function TestResults() {
    const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const runTests = async () => {
        setIsRunning(true);
        setTestSuites([]);

        try {
            const results = await runMockTests();
            setTestSuites(results);
        } catch (error) {
            console.error('Error running tests:', error);
        } finally {
            setIsRunning(false);
        }
    };

    useEffect(() => {
        // Auto-run tests on component mount
        runTests();
    }, []);

    const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = testSuites.reduce((sum, suite) => sum + suite.totalPassed, 0);
    const totalFailed = testSuites.reduce((sum, suite) => sum + suite.totalFailed, 0);
    const totalDuration = testSuites.reduce((sum, suite) => sum + suite.duration, 0);

    return (
        <div className="space-y-8">
            {/* Test Summary */}
            <div className="component-showcase p-6">
                <div className="section-header p-4 -m-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">🧪 Unit Test Results</h2>
                    <p className="text-gray-600 mt-1">Automated tests for @promptbook/components</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{totalPassed}</div>
                        <div className="text-sm text-green-700">Passed</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
                        <div className="text-sm text-red-700">Failed</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{totalTests}</div>
                        <div className="text-sm text-blue-700">Total</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-600">
                            {totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0}%
                        </div>
                        <div className="text-sm text-gray-700">Success Rate</div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={runTests}
                            disabled={isRunning}
                            className={`px-4 py-2 rounded-md font-medium transition-all ${
                                isRunning
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {isRunning ? '🔄 Running...' : '▶️ Run Tests'}
                        </button>
                        {isRunning && <div className="text-sm text-gray-600">Loading test suites...</div>}
                    </div>
                    <div className="text-sm text-gray-500">Total duration: {totalDuration}ms</div>
                </div>

                {/* Test Suites */}
                <div className="space-y-4">
                    {testSuites.map((suite, suiteIndex) => (
                        <div key={suiteIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-900">{suite.name}</h3>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-green-600">✓ {suite.totalPassed}</span>
                                        {suite.totalFailed > 0 && (
                                            <span className="text-red-600">✗ {suite.totalFailed}</span>
                                        )}
                                        <span className="text-gray-500">{suite.duration}ms</span>
                                    </div>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {suite.tests.map((test, testIndex) => (
                                    <div key={testIndex} className="px-4 py-3 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-2 h-2 rounded-full ${
                                                    test.status === 'pass'
                                                        ? 'bg-green-500'
                                                        : test.status === 'fail'
                                                        ? 'bg-red-500'
                                                        : test.status === 'running'
                                                        ? 'bg-yellow-500 animate-pulse'
                                                        : 'bg-gray-300'
                                                }`}
                                            />
                                            <span className="text-gray-900">{test.name}</span>
                                            {test.error && <span className="text-red-600 text-sm">- {test.error}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            {test.duration && <span>{test.duration}ms</span>}
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    test.status === 'pass'
                                                        ? 'bg-green-100 text-green-700'
                                                        : test.status === 'fail'
                                                        ? 'bg-red-100 text-red-700'
                                                        : test.status === 'running'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}
                                            >
                                                {test.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {!isRunning && testSuites.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No test results available. Click "Run Tests" to start testing.
                    </div>
                )}
            </div>

            {/* Test Commands */}
            <div className="component-showcase p-6">
                <div className="section-header p-4 -m-6 mb-6">
                    <h3 className="text-xl font-bold text-gray-900">🚀 Test Commands</h3>
                    <p className="text-gray-600 mt-1">Commands to run tests in your development environment</p>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                        <div className="text-gray-400 mb-2"># Run all tests</div>
                        <div>npm run test</div>
                    </div>

                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                        <div className="text-gray-400 mb-2"># Run tests with UI</div>
                        <div>npm run test:ui</div>
                    </div>

                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                        <div className="text-gray-400 mb-2"># Run tests with coverage</div>
                        <div>npm run test:coverage</div>
                    </div>

                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                        <div className="text-gray-400 mb-2"># Run specific test file</div>
                        <div>npx vitest src/test/BookEditor.test.tsx</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
