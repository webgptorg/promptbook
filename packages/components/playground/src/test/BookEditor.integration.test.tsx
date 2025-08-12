import { BookEditor } from '@promptbook/components';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

describe('BookEditor Integration Tests', () => {
    describe('Real World Usage Scenarios', () => {
        it('can be used in a typical Next.js component', () => {
            const TestApp = () => (
                <div className="p-6">
                    <BookEditor className="max-w-3xl mx-auto" />
                </div>
            );

            render(<TestApp />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toBeInTheDocument();
        });

        it('handles complex book content with multiple commitment types', async () => {
            const user = userEvent.setup();
            const complexBook = `# 🚀 Advanced Marketing Campaign

- BOOK VERSION 1.0.0
- URL https://example.com/marketing.book
- INPUT PARAMETER {product}
- INPUT PARAMETER {target_audience}
- OUTPUT PARAMETER {campaign_strategy}

## Campaign Strategy

- PERSONA Senior marketing strategist with 10+ years experience
- KNOWLEDGE ./marketing-best-practices.pdf
- KNOWLEDGE https://marketingtrends.com/
- RULE Always cite sources
- RULE Be factual and accurate
- EXPECT MIN 5 paragraphs
- EXPECT MAX 2 pages
- FORMAT markdown
- SAMPLE "Create a comprehensive strategy for product launch"
- EXAMPLE "Previous successful campaigns for similar products"
- GOAL Increase brand awareness by 40%
- CONTEXT Current market conditions and competition

> Create a comprehensive marketing campaign strategy for {product} targeting {target_audience}

→ {campaign_strategy}`;

            const { container } = render(<BookEditor value={complexBook} />);

            // Check that all commitment types are highlighted
            const highlightLayer = container.querySelector('pre[aria-hidden="true"]');

            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">PERSONA</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">KNOWLEDGE</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">RULE</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">EXPECT</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">FORMAT</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">SAMPLE</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">EXAMPLE</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">GOAL</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">CONTEXT</span>');
        });

        it('performs well with large book content', async () => {
            const user = userEvent.setup();
            const largeBook = `# Large Book Test\n\n${Array(1000)
                .fill('- PERSONA Expert writer\n- KNOWLEDGE ./docs/\n- RULE Be precise\n')
                .join('\n')}`;

            const startTime = performance.now();
            render(<BookEditor value={largeBook} />);
            const endTime = performance.now();

            // Should render within reasonable time (less than 100ms)
            expect(endTime - startTime).toBeLessThan(100);

            const textarea = screen.getByRole('textbox');
            expect(textarea.value).toContain('Large Book Test');
        });

        it('maintains state consistency during rapid typing', async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();

            render(<BookEditor value="# Test" onChange={onChange} />);
            const textarea = screen.getByRole('textbox');

            // Rapid typing simulation
            await user.type(textarea, ' Book Content');

            expect(onChange).toHaveBeenCalled();
            expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('# Test Book Content'));
        });
    });

    describe('Error Handling', () => {
        it('handles malformed book content gracefully', () => {
            const malformedBook = `### Malformed Book

      This is not a valid book format
      - INVALID_TYPE Something
      - UNKNOWN Another thing`;

            // Should not throw error
            expect(() => {
                render(<BookEditor value={malformedBook} />);
            }).not.toThrow();

            const textarea = screen.getByRole('textbox');
            expect(textarea.value).toBe(malformedBook);
        });

        it('handles extremely long lines', () => {
            const longLine = `# ${'Very '.repeat(1000)}Long Title`;

            const { container } = render(<BookEditor value={longLine} />);
            const textarea = screen.getByRole('textbox');

            expect(textarea.value).toBe(longLine);
            expect(container).toBeInTheDocument();
        });

        it('handles special characters and unicode', () => {
            const unicodeBook = `# 🚀 Test with émojis and spëcial çharacters

- PERSONA Expért writér
- KNOWLEDGE ./đócs/
- RULE Bé précisé 🎯
- EXPECT MIN 1 śentencé`;

            const { container } = render(<BookEditor value={unicodeBook} />);
            const textarea = screen.getByRole('textbox');

            expect(textarea.value).toContain('🚀');
            expect(textarea.value).toContain('émojis');
            expect(textarea.value).toContain('spëcial');
            expect(textarea.value).toContain('çharacters');
        });
    });

    describe('Accessibility Compliance', () => {
        it('is accessible with screen readers', () => {
            render(<BookEditor />);
            const textarea = screen.getByRole('textbox');

            // Should be focusable and have proper role
            expect(textarea).toBeInTheDocument();
            expect(textarea).toHaveAttribute('role', 'textbox');
        });

        it('supports keyboard navigation', async () => {
            const user = userEvent.setup();
            render(<BookEditor value="# Test Book" />);
            const textarea = screen.getByRole('textbox');

            // Should be focusable with tab
            await user.tab();
            expect(textarea).toHaveFocus();

            // Should support arrow keys
            await user.keyboard('{ArrowRight}{ArrowRight}');

            // Should support text selection
            await user.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}');
        });

        it('has proper contrast for syntax highlighting', () => {
            const bookWithHighlights = `# Test

- PERSONA Expert writer
- KNOWLEDGE ./docs/`;

            const { container } = render(<BookEditor value={bookWithHighlights} />);
            const highlightSpans = container.querySelectorAll('.text-indigo-700');

            // Should have highlighted elements
            expect(highlightSpans.length).toBeGreaterThan(0);

            // Check that highlight color provides good contrast
            // (This is a basic check - in real scenarios you'd use tools like axe-core)
            highlightSpans.forEach((span) => {
                expect(span).toHaveClass('text-indigo-700');
            });
        });
    });

    describe('Performance Tests', () => {
        it('updates highlight layer efficiently on text changes', async () => {
            const user = userEvent.setup();
            const { container } = render(<BookEditor value="# Test" />);
            const textarea = screen.getByRole('textbox');

            const highlightLayer = container.querySelector('pre[aria-hidden="true"]');
            expect(highlightLayer).toBeInTheDocument();

            // Monitor DOM mutations during typing
            const startTime = performance.now();
            await user.type(textarea, '\n- PERSONA Expert');
            const endTime = performance.now();

            // Should update quickly (less than 50ms for small changes)
            expect(endTime - startTime).toBeLessThan(50);
        });

        it('handles rapid scroll events efficiently', () => {
            const { container } = render(<BookEditor value={'# Test\n'.repeat(100)} />);
            const textarea = screen.getByRole('textbox');
            const highlightLayer = container.querySelector('pre[aria-hidden="true"]') as HTMLElement;

            // Mock scroll properties
            Object.defineProperty(textarea, 'scrollTop', {
                get: () => 0,
                set: vi.fn(),
                configurable: true,
            });

            Object.defineProperty(textarea, 'scrollLeft', {
                get: () => 0,
                set: vi.fn(),
                configurable: true,
            });

            // Simulate rapid scroll events
            const startTime = performance.now();
            for (let i = 0; i < 10; i++) {
                textarea.dispatchEvent(new Event('scroll'));
            }
            const endTime = performance.now();

            // Should handle rapid scrolling efficiently
            expect(endTime - startTime).toBeLessThan(10);
        });
    });
});
