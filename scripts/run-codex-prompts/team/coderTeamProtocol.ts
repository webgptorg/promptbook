import { z as schema } from 'zod';

/** Maximum question length accepted by both command and planning tools. */
const MAX_MESSAGE_LENGTH = 32_000;
/** Maximum context length accepted by both command and planning tools. */
const MAX_CONTEXT_LENGTH = 64_000;

/** Consultation input is data; callers cannot supply credentials, policy, paths or an agent definition. */
export const CODER_TEAM_ARGUMENTS_SCHEMA = schema
    .object({
        message: schema.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
        context: schema.string().max(MAX_CONTEXT_LENGTH).optional(),
    })
    .strict();

// Note: [💞] Shared TEAM protocol schema.
