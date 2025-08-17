import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
    executionTime: number;
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
    operationsPerSecond: number;
}

export interface PerformanceTestOptions {
    iterations?: number;
    warmupIterations?: number;
    timeout?: number;
}

export class PerformanceTest {
    private startTime: number = 0;
    private endTime: number = 0;
    private startMemory: NodeJS.MemoryUsage | null = null;
    private endMemory: NodeJS.MemoryUsage | null = null;
    private iterations: number = 0;

    constructor(private readonly name: string, private readonly options: PerformanceTestOptions = {}) {
        this.options.iterations = options.iterations || 1000;
        this.options.warmupIterations = options.warmupIterations || 100;
        this.options.timeout = options.timeout || 30000; // 30 seconds default timeout
    }

    public async measure<T>(
        operation: () => Promise<T> | T,
        options: PerformanceTestOptions = {},
    ): Promise<PerformanceMetrics> {
        const iterations = options.iterations || this.options.iterations!;
        const warmupIterations = options.warmupIterations || this.options.warmupIterations!;
        const timeout = options.timeout || this.options.timeout!;

        // Warmup phase
        for (let i = 0; i < warmupIterations; i++) {
            await operation();
        }

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        // Start measurement
        this.startTime = performance.now();
        this.startMemory = process.memoryUsage();
        this.iterations = 0;

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Performance test timed out after ${timeout}ms`)), timeout);
        });

        // Run the operation for the specified number of iterations
        const operationPromise = (async () => {
            for (let i = 0; i < iterations; i++) {
                await operation();
                this.iterations++;
            }
        })();

        await Promise.race([operationPromise, timeoutPromise]);

        // End measurement
        this.endTime = performance.now();
        this.endMemory = process.memoryUsage();

        return this.getMetrics();
    }

    private getMetrics(): PerformanceMetrics {
        if (!this.startMemory || !this.endMemory) {
            throw new Error('Performance test not started or completed');
        }

        const executionTime = this.endTime - this.startTime;
        const operationsPerSecond = (this.iterations / executionTime) * 1000;

        return {
            executionTime,
            memoryUsage: {
                heapUsed: this.endMemory.heapUsed - this.startMemory.heapUsed,
                heapTotal: this.endMemory.heapTotal - this.startMemory.heapTotal,
                external: this.endMemory.external - this.startMemory.external,
                rss: this.endMemory.rss - this.startMemory.rss,
            },
            operationsPerSecond,
        };
    }

    public static async benchmark<T>(
        name: string,
        operation: () => Promise<T> | T,
        options: PerformanceTestOptions = {},
    ): Promise<PerformanceMetrics> {
        const test = new PerformanceTest(name, options);
        return test.measure(operation);
    }

    public static formatMetrics(metrics: PerformanceMetrics): string {
        return `
Performance Metrics:
------------------
Execution Time: ${metrics.executionTime.toFixed(2)}ms
Operations/Second: ${metrics.operationsPerSecond.toFixed(2)}
Memory Usage:
  - Heap Used: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB
  - Heap Total: ${(metrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB
  - External: ${(metrics.memoryUsage.external / 1024 / 1024).toFixed(2)}MB
  - RSS: ${(metrics.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB
`;
    }
}
