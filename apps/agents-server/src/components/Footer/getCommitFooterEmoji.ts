/**
 * Curated list of positive or neutral emojis displayed in the footer's "Made with {emoji} in Europe" line.
 *
 * The order of this list is part of the deterministic mapping from commit SHA to emoji, so existing
 * entries should not be reordered. New emojis can be appended at the end without affecting the
 * indexes of existing ones, but each commit SHA will then map to a different emoji.
 *
 * Hearts, cute animals, plants, fruits, sweets, and celebratory symbols are intentionally chosen so
 * that the footer never shows anything aggressive, scary, or negative.
 */
const POSITIVE_FOOTER_EMOJIS = [
    '❤️',
    '🧡',
    '💛',
    '💚',
    '💙',
    '💜',
    '🤍',
    '💖',
    '💝',
    '🐙',
    '🦄',
    '🐶',
    '🐱',
    '🐰',
    '🦊',
    '🐻',
    '🐼',
    '🐨',
    '🐯',
    '🦁',
    '🐸',
    '🐵',
    '🐧',
    '🦉',
    '🐢',
    '🦋',
    '🐝',
    '🐞',
    '🐳',
    '🐬',
    '🦒',
    '🐘',
    '🌸',
    '🌻',
    '🌷',
    '🌹',
    '🌈',
    '🌟',
    '✨',
    '☀️',
    '🌙',
    '🍀',
    '🌳',
    '🍎',
    '🍓',
    '🍑',
    '🍒',
    '🍋',
    '🍊',
    '🍇',
    '🍉',
    '🍰',
    '🍪',
    '🍩',
    '🍕',
    '🍔',
    '🍦',
    '🍫',
    '🎉',
    '🎈',
    '🎁',
    '🎨',
    '🚀',
    '⭐',
    '💎',
    '🪐',
    '🎵',
] as const;

/**
 * Default emoji used in the footer when no commit SHA is available (for example during local
 * development outside Vercel). Kept as the historic `❤️` so the footer text does not look
 * unusual when the deployment metadata is missing.
 */
const DEFAULT_FOOTER_EMOJI: string = POSITIVE_FOOTER_EMOJIS[0]!;

/**
 * Derives a stable emoji from a commit SHA using a small djb2-style string hash.
 *
 * The same SHA always produces the same emoji, so users can spot a server update by noticing that
 * the footer emoji changed. The result is taken modulo the curated list, so it is always one of
 * the positive/neutral emojis in {@link POSITIVE_FOOTER_EMOJIS}.
 *
 * @param commitSha - Full or short commit SHA. May be `null` or `undefined` when running outside
 *                    a Vercel deployment, in which case {@link DEFAULT_FOOTER_EMOJI} is returned.
 * @returns One emoji from {@link POSITIVE_FOOTER_EMOJIS}.
 * @private Internal to `apps/agents-server`
 */
export function getCommitFooterEmoji(commitSha: string | null | undefined): string {
    if (!commitSha) {
        return DEFAULT_FOOTER_EMOJI;
    }

    let hash = 0;
    for (let characterIndex = 0; characterIndex < commitSha.length; characterIndex++) {
        hash = (hash * 31 + commitSha.charCodeAt(characterIndex)) | 0;
    }

    const emojiIndex = Math.abs(hash) % POSITIVE_FOOTER_EMOJIS.length;
    return POSITIVE_FOOTER_EMOJIS[emojiIndex]!;
}
