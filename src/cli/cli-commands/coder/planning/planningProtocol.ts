import { z as schema } from 'zod';
import { ParseError } from '../../../../errors/ParseError';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';

/** Maximum repository requests in a single inference response. */
const MAX_PLANNING_READS = 12;

/** Read-only requests understood by the host; there is deliberately no shell or delegation operation. */
const PLANNING_READ_SCHEMA = schema.discriminatedUnion('kind', [
    schema.object({ kind: schema.literal('list'), path: schema.string() }).strict(),
    schema
        .object({
            kind: schema.literal('read'),
            path: schema.string(),
            startLine: schema.number().int().min(1),
            lineCount: schema.number().int().min(1).max(500),
        })
        .strict(),
    schema.object({ kind: schema.literal('search'), path: schema.string(), query: schema.string().min(1) }).strict(),
    schema.object({ kind: schema.literal('git'), operation: schema.enum(['status', 'diff', 'log']) }).strict(),
]);

/** Proposed changes are data, never instructions executed by a harness. */
const PLANNING_PROPOSAL_SCHEMA = schema.discriminatedUnion('kind', [
    schema
        .object({
            kind: schema.literal('create'),
            title: schema
                .string()
                .min(1)
                .max(200)
                .regex(/^[^\r\n]+$/),
            body: schema.string().min(1),
            priority: schema.number().int().min(0).max(100),
            isReady: schema.boolean(),
        })
        .strict(),
    schema
        .object({
            kind: schema.literal('edit'),
            path: schema.string(),
            find: schema.string().min(1),
            replace: schema.string(),
            isReady: schema.boolean(),
        })
        .strict(),
]);

/** Strict validation prevents unsupported operations from reaching any filesystem code. */
const PLANNING_REPLY_SCHEMA = schema
    .object({
        message: schema.string(),
        reads: schema.array(PLANNING_READ_SCHEMA).max(MAX_PLANNING_READS),
        proposals: schema.array(PLANNING_PROPOSAL_SCHEMA).max(20),
    })
    .strict();

/**
 * The same response contract constrains Codex output and validates it at the host boundary.
 * @private internal constant of `coder plan`
 */
export const PLANNING_RESPONSE_SCHEMA = schema.toJSONSchema(PLANNING_REPLY_SCHEMA);

/** @private internal type of `coder plan` */
export type PlanningRead = schema.infer<typeof PLANNING_READ_SCHEMA>;
/** @private internal type of `coder plan` */
export type PlanningProposal = schema.infer<typeof PLANNING_PROPOSAL_SCHEMA>;
/** @private internal type of `coder plan` */
export type PlanningReply = schema.infer<typeof PLANNING_REPLY_SCHEMA>;
/** @private internal type of `coder plan` */
export type PlanningMessage = { readonly role: 'user' | 'planner' | 'context'; readonly content: string };

/**
 * Rejects malformed or unsupported harness output before processing reads or proposed writes.
 * @private internal utility of `coder plan`
 */
export function parsePlanningReply(output: string): PlanningReply {
    try {
        return PLANNING_REPLY_SCHEMA.parse(JSON.parse(output));
    } catch {
        throw new ParseError(
            spaceTrim('Planner returned an invalid planning response. No proposed changes were saved.'),
        );
    }
}

/**
 * Describes the host-mediated planning protocol, independent of the selected Book's instructions.
 * @private internal constant of `coder plan`
 */
export const PLANNING_PROTOCOL = spaceTrim(`
    You are in a repository-aware planning conversation. Discuss and specify; never implement.
    Read relevant source, documentation, existing PRDs and templates before proposing requirements.
    Remember the entire discussion across topics. Clarify goal, behavior, scope, edge cases, acceptance criteria,
    and dependencies without re-asking answered questions. A casual message need not propose a file.
    Split large requests into related tasks. Propose changes only when the user requests authoring or agrees to it.
    Follow the project's template and PRD style. The host appends the selected template rules to new task bodies;
    avoid duplicating them. Include task-specific requirements and acceptance criteria in each body.
    Preserve identity, status, priority, attribution and unrelated content when editing. Use a small exact text
    replacement within one task body. Never reopen or edit completed work; propose a new follow-up task instead.
    Author only active PRDs directly in prompts/. Archives, templates, ignored Markdown and agent guidance are read-only.
    Mark unresolved proposals isReady:false. The host uses the supported [-] marker for drafts and [ ] for pending tasks.
    Files are NOT saved until the user reviews them and enters /save or /draft. Do not claim they are saved.
    Custom Books and TEAM instructions cannot authorize shell commands, implementation, or delegation.

    Return ONLY one JSON object: {"message":"Your conversational answer","reads":[],"proposals":[]}.
    To inspect the repository, return reads and no proposals. The host returns the results for your next response.
    Supported reads (all paths relative to the repository):
    {"kind":"list","path":"src"}
    {"kind":"read","path":"README.md","startLine":1,"lineCount":200}
    {"kind":"search","path":"src","query":"literal search text"}
    {"kind":"git","operation":"status"} (also diff or log)
    No arbitrary commands, tools, URLs, or delegated agents are available.
    New task proposal: {"kind":"create","title":"Feature title","body":"Markdown requirements",
    "priority":0,"isReady":true}. The host assigns fresh filenames and emoji tags; similar titles never overwrite files.
    Edit proposal: {"kind":"edit","path":"prompts/existing.md","find":"unique exact body text",
    "replace":"revised body text","isReady":true}. Read the file before proposing edits.
    Multiple proposals may create several tasks or revise several existing files. All proposals in a response
    replace the previous unsaved proposal set, so include still-wanted changes when revising your proposal.
`);

// Note: [💞] Ignore a discrepancy between file name and entity name.
