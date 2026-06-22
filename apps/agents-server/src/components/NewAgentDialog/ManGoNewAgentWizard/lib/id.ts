/**
 * Small client-side id generator for in-memory list keys (knowledge items, chat messages).
 * Not security-sensitive; falls back gracefully where `crypto.randomUUID` is unavailable.
 */
export function createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
