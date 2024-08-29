/**
 * Represents a command that expects a specific format.
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ExpectFormatCommand = {
    readonly type: 'EXPECT_FORMAT';
    readonly format: 'JSON';
};

// <- TODO: [🦽] Why this is constantly removed by repair-imports.ts
