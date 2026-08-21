import { spaceTrim } from 'spacetrim';
import { describe, expect, it } from '@jest/globals';
import { validateBook } from '../../book-2.0/agent-source/string_book';
import { COMMITMENT_REGISTRY } from '../../commitments';
import { createDeprecatedCommitmentDiagnostics } from './createDeprecatedCommitmentDiagnostics.browser';

describe('createDeprecatedCommitmentDiagnostics', () => {
    it('creates warnings for every deprecated commitment in the shared catalog', () => {
        const deprecatedCommitmentTypes = COMMITMENT_REGISTRY.filter(({ deprecation }) => deprecation).map(
            ({ type }) => type,
        );
        const diagnostics = createDeprecatedCommitmentDiagnostics(
            validateBook(
                spaceTrim(`Catalog test agent

${deprecatedCommitmentTypes.map((type) => `${type} Legacy commitment content.`).join('\n')}`),
            ),
        );

        expect(diagnostics).toHaveLength(deprecatedCommitmentTypes.length);

        for (const commitmentType of deprecatedCommitmentTypes) {
            expect(diagnostics).toContainEqual(
                expect.objectContaining({
                    message: expect.stringContaining(`\`${commitmentType}\` is deprecated.`),
                    severity: 'warning',
                    source: 'Promptbook',
                }),
            );
        }
    });

    it('creates warning diagnostics for deprecated SAMPLE and EXAMPLE commitments', () => {
        const diagnostics = createDeprecatedCommitmentDiagnostics(
            validateBook(
                spaceTrim(`Copywriter

SAMPLE Legacy sample
RULE Stay accurate
EXAMPLE Newer legacy sample`),
            ),
        );

        expect(diagnostics).toEqual([
            expect.objectContaining({
                startLineNumber: 3,
                message: '`SAMPLE` is deprecated. Use `WRITING SAMPLE` for explicit voice exemplars.',
                severity: 'warning',
                source: 'Promptbook',
            }),
            expect.objectContaining({
                startLineNumber: 5,
                message: '`EXAMPLE` is deprecated. Use `WRITING SAMPLE` for explicit voice exemplars.',
                severity: 'warning',
                source: 'Promptbook',
            }),
        ]);
    });

    it('creates warning diagnostics for deprecated PERSONA commitments', () => {
        const diagnostics = createDeprecatedCommitmentDiagnostics(
            validateBook(
                spaceTrim(`Planner

PERSONA You are a practical planning assistant.
GOAL Help the user turn plans into concrete next steps.`),
            ),
        );

        expect(diagnostics).toEqual([
            expect.objectContaining({
                startLineNumber: 3,
                message: '`PERSONA` is deprecated. Use `GOAL` for agent profile text and inheritance-safe rewrites.',
                severity: 'warning',
                source: 'Promptbook',
            }),
        ]);
    });

    it('creates warning diagnostics for deprecated STYLE commitments', () => {
        const diagnostics = createDeprecatedCommitmentDiagnostics(
            validateBook(
                spaceTrim(`Copywriter

STYLE Keep responses crisp and upbeat.
WRITING RULES Keep paragraphs short.`),
            ),
        );

        expect(diagnostics).toEqual([
            expect.objectContaining({
                startLineNumber: 3,
                message:
                    '`STYLE` is deprecated. Use `WRITING RULES` for writing-only constraints such as tone, length, formatting, or emoji usage.',
                severity: 'warning',
                source: 'Promptbook',
            }),
        ]);
    });

    it('creates warning diagnostics for deprecated TEMPLATE and FORMAT commitments', () => {
        const diagnostics = createDeprecatedCommitmentDiagnostics(
            validateBook(
                spaceTrim(`Data Analyst

TEMPLATE Always structure the response with summary, details, and next steps.
FORMAT Use markdown headings and bullet points.`),
            ),
        );

        expect(diagnostics).toEqual([
            expect.objectContaining({
                startLineNumber: 3,
                message: '`TEMPLATE` is deprecated. Use `WRITING SAMPLE` and `WRITING RULES` instead.',
                severity: 'warning',
                source: 'Promptbook',
            }),
            expect.objectContaining({
                startLineNumber: 4,
                message: '`FORMAT` is deprecated. Use `WRITING SAMPLE` and `WRITING RULES` instead.',
                severity: 'warning',
                source: 'Promptbook',
            }),
        ]);
    });

    it('creates warning diagnostics for unfinished DELETE commitments', () => {
        const diagnostics = createDeprecatedCommitmentDiagnostics(
            validateBook(
                spaceTrim(`Prompt Surgeon

DELETE Remove conflicting instructions
REMOVE Remove conflicting tone requirements`),
            ),
        );

        expect(diagnostics).toEqual([
            expect.objectContaining({
                startLineNumber: 3,
                message: '`DELETE` is unfinished and not ready to use. Be careful when using it.',
                severity: 'warning',
                source: 'Promptbook',
            }),
            expect.objectContaining({
                startLineNumber: 4,
                message: '`REMOVE` is unfinished and not ready to use. Be careful when using it.',
                severity: 'warning',
                source: 'Promptbook',
            }),
        ]);
    });

    it('creates warning diagnostics for low-level MODEL commitments', () => {
        const diagnostics = createDeprecatedCommitmentDiagnostics(
            validateBook(
                spaceTrim(`Model Tuner

MODEL NAME gpt-4
RULE Keep responses precise.`),
            ),
        );

        expect(diagnostics).toEqual([
            expect.objectContaining({
                startLineNumber: 3,
                message: '`MODEL` is low-level and not used by most of the users. Be careful when using it.',
                severity: 'warning',
                source: 'Promptbook',
            }),
        ]);
    });

    it('does not create warnings for WRITING SAMPLE, WRITING RULES, or RULE', () => {
        const diagnostics = createDeprecatedCommitmentDiagnostics(
            validateBook(
                spaceTrim(`Copywriter

WRITING SAMPLE Fresh sample
WRITING RULES Keep it short
RULE Stay accurate`),
            ),
        );

        expect(diagnostics).toEqual([]);
    });
});
