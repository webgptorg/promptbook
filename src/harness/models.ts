/**
 * Declared metadata of one model: its actual manufacturer and that manufacturer's country of origin.
 *
 * @private harness model metadata
 */
export type ModelMetadata = { readonly provider?: string; readonly origin?: string };

/**
 * Known model families by identifier. A model reached through another harness, host or account keeps its
 * manufacturer (a locally hosted OpenAI-compatible endpoint does not make a model OpenAI-made); anything unlisted
 * stays unknown and never satisfies a provider/origin restriction.
 */
const FAMILIES: ReadonlyArray<{ readonly pattern: RegExp; readonly provider: string; readonly origin: string }> = [
    { pattern: /^(gpt|o[1-9]|codex|chatgpt)([-.]|$)/i, provider: 'OpenAI', origin: 'USA' },
    { pattern: /^(claude|opus|sonnet|haiku)([-.]|$)/i, provider: 'Anthropic', origin: 'USA' },
    { pattern: /^(gemini|gemma)([-.]|$)/i, provider: 'Google', origin: 'USA' },
    { pattern: /^grok([-.]|$)/i, provider: 'xAI', origin: 'USA' },
    { pattern: /^(llama|codellama)([-.\d]|$)/i, provider: 'Meta', origin: 'USA' },
    { pattern: /^(mistral|mixtral|codestral|devstral|magistral)([-.]|$)/i, provider: 'Mistral AI', origin: 'France' },
    { pattern: /^(qwen|qwq)([-.\d]|$)/i, provider: 'Alibaba', origin: 'China' },
    { pattern: /^deepseek([-.]|$)/i, provider: 'DeepSeek', origin: 'China' },
    { pattern: /^(kimi|moonshot)([-.]|$)/i, provider: 'Moonshot AI', origin: 'China' },
    { pattern: /^(glm|chatglm)([-.\d]|$)/i, provider: 'Zhipu AI', origin: 'China' },
];

/**
 * Manufacturer/origin of a model identifier (`openai/gpt-5`, `anthropic/claude-…` and bare IDs alike), when known.
 *
 * @private harness model metadata
 */
export function modelMetadata(model: string | undefined): ModelMetadata {
    if (!model) return {};
    const bare = model.split('/').pop() ?? model;
    const family = FAMILIES.find((candidate) => candidate.pattern.test(bare));
    return family ? { provider: family.provider, origin: family.origin } : {};
}
