import React from 'react';

/**
 * Default grid layout for general homepage sections that do not require the agent-specific sizing.
 */
const DEFAULT_SECTION_GRID_CLASS = 'grid gap-6 md:grid-cols-2 lg:grid-cols-3';

/**
 * Props for the homepage section wrapper.
 *
 * @private internal layout helper for the Agents Server homepage components.
 */
type SectionProps = {
    title: React.ReactNode;
    children: React.ReactNode;
    gridClassName?: string;
};

/**
 * Layout wrapper that adds a heading and grid container for grouped cards on the homepage.
 *
 * @private internal layout helper for the Agents Server homepage components.
 */
export function Section({ title, children, gridClassName = DEFAULT_SECTION_GRID_CLASS }: SectionProps) {
    return (
        <section className="mt-16 first:mt-4 mb-4">
            <h2 className="text-3xl text-gray-900 mb-6 font-light">{title}</h2>
            <div className={gridClassName}>{children}</div>
        </section>
    );
}
