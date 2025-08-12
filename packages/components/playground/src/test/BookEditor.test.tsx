import { BookEditor } from '@promptbook/components';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('BookEditor Component', () => {
    describe('Basic Rendering', () => {
        it('renders without crashing', () => {
            render(<BookEditor />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toBeInTheDocument();
        });

        it('renders with default book content', () => {
            render(<BookEditor />);
            const textarea = screen.getByRole('textbox');
            expect(textarea.value).toContain('# ✨ Simple Example');
        });

        it('applies custom className to container', () => {
            const customClass = 'my-custom-class';
            const { container } = render(<BookEditor className={customClass} />);
            const editorContainer = container.firstChild;
            expect(editorContainer).toHaveClass(customClass);
        });

        it('applies fontClassName to editor elements', () => {
            const fontClass = 'custom-font';
            render(<BookEditor fontClassName={fontClass} />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass(fontClass);
        });
    });

    describe('Controlled Component', () => {
        it('accepts controlled value prop', () => {
            const testValue = '# Test Book\n\nSome content';
            render(<BookEditor value={testValue} />);
            const textarea = screen.getByRole('textbox');
            expect(textarea.value).toBe(testValue);
        });

        it('calls onChange when text changes in controlled mode', async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const initialValue = '# Test';

            render(<BookEditor value={initialValue} onChange={onChange} />);
            const textarea = screen.getByRole('textbox');

            await user.type(textarea, ' Book');

            expect(onChange).toHaveBeenCalled();
            // Should be called with validated book content
            expect(onChange).toHaveBeenCalledWith(expect.stringContaining('# Test Book'));
        });

        it('does not change value internally when controlled', async () => {
            const user = userEvent.setup();
            const controlledValue = '# Controlled';

            render(<BookEditor value={controlledValue} />);
            const textarea = screen.getByRole('textbox');

            await user.type(textarea, ' Test');

            // Value should remain as controlled value (since no onChange handler)
            expect(textarea.value).toBe(controlledValue);
        });
    });

    describe('Uncontrolled Component', () => {
        it('manages internal state when no value prop provided', async () => {
            const user = userEvent.setup();
            render(<BookEditor />);
            const textarea = screen.getByRole('textbox');

            await user.clear(textarea);
            await user.type(textarea, '# Uncontrolled Test');

            expect(textarea.value).toBe('# Uncontrolled Test');
        });

        it('calls onChange in uncontrolled mode', async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();

            render(<BookEditor onChange={onChange} />);
            const textarea = screen.getByRole('textbox');

            await user.type(textarea, 'X');

            expect(onChange).toHaveBeenCalled();
        });
    });

    describe('Syntax Highlighting', () => {
        it('highlights commitment types in the background layer', () => {
            const bookWithCommitments = `# Test Book

- PERSONA Expert writer
- KNOWLEDGE ./docs/
- RULE Be precise
- EXPECT MIN 1 sentence`;

            const { container } = render(<BookEditor value={bookWithCommitments} />);

            // Check if highlight layer exists
            const highlightLayer = container.querySelector('pre[aria-hidden="true"]');
            expect(highlightLayer).toBeInTheDocument();

            // Check if commitment types are wrapped in highlight spans
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">PERSONA</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">KNOWLEDGE</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">RULE</span>');
            expect(highlightLayer?.innerHTML).toContain('<span class="text-indigo-700">EXPECT</span>');
        });

        it('escapes HTML in highlighted content', () => {
            const bookWithHtml = '# Test <script>alert("xss")</script>';
            const { container } = render(<BookEditor value={bookWithHtml} />);

            const highlightLayer = container.querySelector('pre[aria-hidden="true"]');
            expect(highlightLayer?.innerHTML).toContain('&lt;script&gt;');
            expect(highlightLayer?.innerHTML).not.toContain('<script>');
        });
    });

    describe('Scroll Synchronization', () => {
        it('synchronizes scroll between textarea and highlight layer', () => {
            const longContent = '# Long content\n'.repeat(100);
            const { container } = render(<BookEditor value={longContent} />);

            const textarea = screen.getByRole('textbox');
            const highlightLayer = container.querySelector('pre[aria-hidden="true"]') as HTMLElement;

            // Mock scroll properties
            Object.defineProperty(textarea, 'scrollTop', {
                get: () => 100,
                set: () => {},
                configurable: true,
            });

            Object.defineProperty(textarea, 'scrollLeft', {
                get: () => 50,
                set: () => {},
                configurable: true,
            });

            // Trigger scroll event
            fireEvent.scroll(textarea);

            // Check if highlight layer scroll is synchronized
            expect(highlightLayer.scrollTop).toBe(100);
            expect(highlightLayer.scrollLeft).toBe(50);
        });
    });

    describe('Line Height Calculation', () => {
        it('calculates and applies line height', () => {
            // Mock getComputedStyle
            const originalGetComputedStyle = window.getComputedStyle;
            window.getComputedStyle = vi.fn(() => ({
                lineHeight: '24px',
            })) as any;

            const { container } = render(<BookEditor />);
            const textarea = screen.getByRole('textbox');
            const highlightLayer = container.querySelector('pre[aria-hidden="true"]') as HTMLElement;

            expect(textarea.style.lineHeight).toBe('24px');
            expect(highlightLayer.style.lineHeight).toBe('24px');

            // Restore original function
            window.getComputedStyle = originalGetComputedStyle;
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA attributes', () => {
            render(<BookEditor />);
            const textarea = screen.getByRole('textbox');

            expect(textarea).toBeInTheDocument();
            expect(textarea).toHaveAttribute('spellCheck', 'false');
        });

        it('has hidden highlight layer for screen readers', () => {
            const { container } = render(<BookEditor />);
            const highlightLayer = container.querySelector('pre[aria-hidden="true"]');

            expect(highlightLayer).toHaveAttribute('aria-hidden', 'true');
        });
    });

    describe('Book Validation', () => {
        it('validates book content on change', async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();

            render(<BookEditor value="" onChange={onChange} />);
            const textarea = screen.getByRole('textbox');

            await user.type(textarea, '# Valid Book');

            expect(onChange).toHaveBeenCalledWith(expect.stringContaining('# Valid Book'));
        });
    });
});
