import { BookEditor } from '@promptbook/components';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

describe('BookEditor Performance Tests', () => {
    let performanceMarks: string[] = [];

    beforeEach(() => {
        performanceMarks = [];
        performance.clearMarks();
        performance.clearMeasures();
    });

    const measurePerformance = (name: string, fn: () => void) => {
        performance.mark(`${name}-start`);
        fn();
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        performanceMarks.push(name);
    };

    describe('Rendering Performance', () => {
        it('renders small book content quickly', () => {
            const smallBook = `# Small Book

- PERSONA Expert writer
- KNOWLEDGE ./docs/
- RULE Be precise

> Write something

→ {output}`;

            let renderTime = 0;
            measurePerformance('small-book-render', () => {
                const start = performance.now();
                render(<BookEditor value={smallBook} />);
                renderTime = performance.now() - start;
            });

            expect(renderTime).toBeLessThan(50); // Should render in less than 50ms
            const textarea = screen.getByRole('textbox');
            expect(textarea).toBeInTheDocument();
        });

        it('renders medium book content efficiently', () => {
            const mediumBook = Array(100)
                .fill(
                    `# Section

- PERSONA Expert writer
- KNOWLEDGE ./docs/
- RULE Be precise
- EXPECT MIN 1 sentence

> Write something about the topic

→ {output}`,
                )
                .join('\n\n');

            let renderTime = 0;
            measurePerformance('medium-book-render', () => {
                const start = performance.now();
                render(<BookEditor value={mediumBook} />);
                renderTime = performance.now() - start;
            });

            expect(renderTime).toBeLessThan(200); // Should render in less than 200ms
        });

        it('handles large book content within performance budget', () => {
            const largeBook = Array(500)
                .fill(
                    `# Large Section ${Math.random()}

- PERSONA Expert writer with extensive experience
- KNOWLEDGE ./extensive-documentation/
- KNOWLEDGE https://external-knowledge-source.com/
- RULE Be extremely precise and detailed
- RULE Follow all guidelines carefully
- EXPECT MIN 5 sentences
- EXPECT MAX 3 paragraphs
- FORMAT markdown
- SAMPLE "This is a sample output"
- EXAMPLE "Here's how it should look"

> Write detailed content about the complex topic with proper formatting

→ {detailed_output}`,
                )
                .join('\n\n');

            let renderTime = 0;
            measurePerformance('large-book-render', () => {
                const start = performance.now();
                render(<BookEditor value={largeBook} />);
                renderTime = performance.now() - start;
            });

            expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second
        });
    });

    describe('Update Performance', () => {
        it('updates highlight layer efficiently on text changes', async () => {
            const user = userEvent.setup();
            const { container } = render(<BookEditor value="# Test" />);
            const textarea = screen.getByRole('textbox');
            const highlightLayer = container.querySelector('pre[aria-hidden="true"]');

            let updateTime = 0;
            await measurePerformance('highlight-update', async () => {
                const start = performance.now();
                await user.type(textarea, '\n- PERSONA Expert');
                updateTime = performance.now() - start;
            });

            expect(updateTime).toBeLessThan(100); // Should update in less than 100ms
            expect(highlightLayer?.innerHTML).toContain('PERSONA');
        });

        it('handles rapid typing without performance degradation', async () => {
            const user = userEvent.setup();
            render(<BookEditor value="" />);
            const textarea = screen.getByRole('textbox');

            const rapidText = 'PERSONA KNOWLEDGE RULE EXPECT FORMAT SAMPLE EXAMPLE GOAL CONTEXT';

            let typingTime = 0;
            await measurePerformance('rapid-typing', async () => {
                const start = performance.now();
                await user.type(textarea, rapidText);
                typingTime = performance.now() - start;
            });

            // Should handle rapid typing efficiently (target: <5ms per character)
            expect(typingTime / rapidText.length).toBeLessThan(5);
        });
    });

    describe('Scroll Performance', () => {
        it('synchronizes scroll efficiently', () => {
            const longContent = Array(200).fill('# Section\n\nContent here\n').join('\n');
            const { container } = render(<BookEditor value={longContent} />);
            const textarea = screen.getByRole('textbox');
            const highlightLayer = container.querySelector('pre[aria-hidden="true"]') as HTMLElement;

            // Mock scroll properties
            let scrollTop = 0;
            let scrollLeft = 0;

            Object.defineProperty(textarea, 'scrollTop', {
                get: () => scrollTop,
                set: (value: number) => {
                    scrollTop = value;
                },
                configurable: true,
            });

            Object.defineProperty(textarea, 'scrollLeft', {
                get: () => scrollLeft,
                set: (value: number) => {
                    scrollLeft = value;
                },
                configurable: true,
            });

            let scrollTime = 0;
            measurePerformance('scroll-sync', () => {
                const start = performance.now();

                // Simulate multiple scroll events
                for (let i = 0; i < 10; i++) {
                    scrollTop = i * 10;
                    scrollLeft = i * 5;
                    textarea.dispatchEvent(new Event('scroll'));
                }

                scrollTime = performance.now() - start;
            });

            expect(scrollTime).toBeLessThan(20); // Should handle 10 scroll events in <20ms
            expect(highlightLayer.scrollTop).toBe(90);
            expect(highlightLayer.scrollLeft).toBe(45);
        });
    });

    describe('Memory Performance', () => {
        it('does not leak memory on unmount', () => {
            const initialMemory = performance.memory?.usedJSHeapSize || 0;

            // Render and unmount multiple times
            for (let i = 0; i < 10; i++) {
                const { unmount } = render(<BookEditor value={`# Test ${i}`} />);
                unmount();
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = performance.memory?.usedJSHeapSize || 0;
            const memoryIncrease = finalMemory - initialMemory;

            // Memory increase should be minimal (less than 1MB)
            expect(memoryIncrease).toBeLessThan(1024 * 1024);
        });

        it('handles event listener cleanup properly', () => {
            let eventListenerCount = 0;

            // Mock addEventListener to count listeners
            const originalAddEventListener = window.addEventListener;
            const originalRemoveEventListener = window.removeEventListener;

            window.addEventListener = vi.fn((...args) => {
                eventListenerCount++;
                return originalAddEventListener.apply(window, args);
            });

            window.removeEventListener = vi.fn((...args) => {
                eventListenerCount--;
                return originalRemoveEventListener.apply(window, args);
            });

            const { unmount } = render(<BookEditor value="# Test" />);
            unmount();

            // Should have cleaned up all event listeners
            expect(eventListenerCount).toBeLessThanOrEqual(0);

            // Restore original functions
            window.addEventListener = originalAddEventListener;
            window.removeEventListener = originalRemoveEventListener;
        });
    });

    describe('Performance Benchmarks', () => {
        afterEach(() => {
            // Log performance results for CI/CD
            performanceMarks.forEach((mark) => {
                const measure = performance.getEntriesByName(mark)[0];
                if (measure) {
                    console.log(`📊 ${mark}: ${measure.duration.toFixed(2)}ms`);
                }
            });
        });

        it('meets performance budget for typical usage', async () => {
            const user = userEvent.setup();
            const typicalBook = `# Marketing Campaign Generator

- BOOK VERSION 1.0.0
- INPUT PARAMETER {product}
- INPUT PARAMETER {audience}
- OUTPUT PARAMETER {campaign}

## Campaign Strategy

- PERSONA Senior marketing strategist
- KNOWLEDGE ./marketing-best-practices.md
- RULE Include target metrics
- EXPECT MIN 3 paragraphs
- FORMAT markdown

> Create a marketing campaign for {product} targeting {audience}

→ {campaign}`;

            // Measure complete interaction flow
            let totalTime = 0;

            measurePerformance('complete-interaction', async () => {
                const start = performance.now();

                // Initial render
                render(<BookEditor value={typicalBook} />);
                const textarea = screen.getByRole('textbox');

                // User interaction
                await user.click(textarea);
                await user.type(textarea, '\n\n## Additional Section\n- GOAL Increase awareness');

                totalTime = performance.now() - start;
            });

            // Complete interaction should be smooth (< 500ms)
            expect(totalTime).toBeLessThan(500);
        });
    });
});
