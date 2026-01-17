'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ChatMessage } from '../types/ChatMessage';
import styles from './ChatEmojiEffects.module.css';

type ChatEmojiEffectsProps = {
    messages: ReadonlyArray<ChatMessage>;
};

type EffectType = 'confetti' | 'hearts';

type ConfettiPiece = {
    id: string;
    left: string;
    size: number;
    rotation: number;
    drift: number;
    delay: number;
    duration: number;
    color: string;
};

type HeartPiece = {
    id: string;
    left: string;
    size: number;
    rotation: number;
    drift: number;
    delay: number;
    duration: number;
    glyph: string;
};

type Effect = {
    id: string;
    type: EffectType;
    durationMs: number;
    confettiPieces?: ConfettiPiece[];
    heartPieces?: HeartPiece[];
};

type EffectCssVars = CSSProperties & {
    '--left': string;
    '--size': string;
    '--delay': string;
    '--duration': string;
    '--drift': string;
    '--rotation': string;
    '--color'?: string;
};

const CONFETTI_EMOJI = String.fromCodePoint(0x1f389);
const HEART_EMOJI_REGEX = /[\u2763\u2764\u{1f493}-\u{1f49f}\u{1f5a4}\u{1f90d}\u{1f90e}\u{1f9e1}\u{1fa75}-\u{1fa79}]/u;

const HEART_GLYPHS = [
    String.fromCodePoint(0x2764),
    String.fromCodePoint(0x1f49b),
    String.fromCodePoint(0x1f49c),
    String.fromCodePoint(0x1f49d),
    String.fromCodePoint(0x1f49e),
    String.fromCodePoint(0x1f496),
    String.fromCodePoint(0x1f497),
    String.fromCodePoint(0x1f498),
    String.fromCodePoint(0x1f49a),
    String.fromCodePoint(0x1f499),
    String.fromCodePoint(0x1f49f),
    String.fromCodePoint(0x1f9e1),
    String.fromCodePoint(0x1f90d),
    String.fromCodePoint(0x1f90e),
    String.fromCodePoint(0x1f5a4),
    String.fromCodePoint(0x1fa75),
    String.fromCodePoint(0x1fa76),
    String.fromCodePoint(0x1fa77),
    String.fromCodePoint(0x1fa78),
];

const CONFETTI_COLORS = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#577590', '#277da1', '#f9844a'];
const DEFAULT_CONFETTI_COLOR = '#f94144';
const DEFAULT_HEART_GLYPH = String.fromCodePoint(0x2764);

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

let effectSequence = 0;
const createEffectId = (prefix: string) => {
    effectSequence += 1;
    return `${prefix}-${Date.now()}-${effectSequence}`;
};

const createConfettiBurst = (): Effect => {
    const effectId = createEffectId('confetti');
    const pieceCount = 32;
    let maxDuration = 0;

    const confettiPieces = Array.from({ length: pieceCount }, (_, index) => {
        const delay = randomBetween(0, 0.2);
        const duration = randomBetween(1.1, 1.9);
        const totalDuration = delay + duration;
        const piece: ConfettiPiece = {
            id: `${effectId}-${index}`,
            left: `${randomBetween(5, 95).toFixed(2)}%`,
            size: randomBetween(6, 12),
            rotation: randomBetween(0, 360),
            drift: randomBetween(-140, 140),
            delay,
            duration,
            color: CONFETTI_COLORS[index % CONFETTI_COLORS.length] ?? DEFAULT_CONFETTI_COLOR,
        };

        if (totalDuration > maxDuration) {
            maxDuration = totalDuration;
        }

        return piece;
    });

    return {
        id: effectId,
        type: 'confetti',
        durationMs: Math.ceil(maxDuration * 1000),
        confettiPieces,
    };
};

const createHeartBurst = (): Effect => {
    const effectId = createEffectId('hearts');
    const pieceCount = 14;
    let maxDuration = 0;

    const heartPieces = Array.from({ length: pieceCount }, (_, index) => {
        const delay = randomBetween(0, 0.3);
        const duration = randomBetween(1.5, 2.6);
        const totalDuration = delay + duration;
        const piece: HeartPiece = {
            id: `${effectId}-${index}`,
            left: `${randomBetween(10, 90).toFixed(2)}%`,
            size: randomBetween(18, 28),
            rotation: randomBetween(-18, 18),
            drift: randomBetween(-120, 120),
            delay,
            duration,
            glyph: HEART_GLYPHS[index % HEART_GLYPHS.length] ?? DEFAULT_HEART_GLYPH,
        };

        if (totalDuration > maxDuration) {
            maxDuration = totalDuration;
        }

        return piece;
    });

    return {
        id: effectId,
        type: 'hearts',
        durationMs: Math.ceil(maxDuration * 1000),
        heartPieces,
    };
};

const shouldTriggerConfetti = (content: string) => content.includes(CONFETTI_EMOJI);

const shouldTriggerHearts = (content: string) => HEART_EMOJI_REGEX.test(content);

/**
 * @private internal effect layer for `<Chat />` emoji animations.
 */
export function ChatEmojiEffects({ messages }: ChatEmojiEffectsProps) {
    const [effects, setEffects] = useState<Effect[]>([]);
    const previousMessageCountRef = useRef<number | null>(null);
    const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

    const triggerEffect = useCallback((type: EffectType) => {
        const effect = type === 'confetti' ? createConfettiBurst() : createHeartBurst();

        setEffects((previous) => [...previous, effect]);

        const timeoutId = setTimeout(() => {
            setEffects((previous) => previous.filter((entry) => entry.id !== effect.id));
        }, effect.durationMs);

        timeoutsRef.current.push(timeoutId);
    }, []);

    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        };
    }, []);

    useEffect(() => {
        if (previousMessageCountRef.current === null) {
            // Avoid replaying effects for existing history on initial render.
            previousMessageCountRef.current = messages.length;
            return;
        }

        const previousCount = previousMessageCountRef.current;
        previousMessageCountRef.current = messages.length;

        if (messages.length <= previousCount) {
            return;
        }

        const newMessages = messages.slice(previousCount);

        newMessages.forEach((message) => {
            if (message.sender !== 'USER') {
                return;
            }

            const content = message.content || '';

            if (shouldTriggerConfetti(content)) {
                triggerEffect('confetti');
            }

            if (shouldTriggerHearts(content)) {
                triggerEffect('hearts');
            }
        });
    }, [messages, triggerEffect]);

    if (effects.length === 0) {
        return null;
    }

    return (
        <div className={styles.effectsLayer} aria-hidden="true">
            {effects.map((effect) => {
                if (effect.type === 'confetti' && effect.confettiPieces) {
                    return (
                        <div key={effect.id} className={styles.confettiBurst}>
                            {effect.confettiPieces.map((piece) => (
                                <span
                                    key={piece.id}
                                    className={styles.confettiPiece}
                                    style={
                                        {
                                            '--left': piece.left,
                                            '--size': `${piece.size}px`,
                                            '--delay': `${piece.delay}s`,
                                            '--duration': `${piece.duration}s`,
                                            '--drift': `${piece.drift}px`,
                                            '--rotation': `${piece.rotation}deg`,
                                            '--color': piece.color,
                                        } as EffectCssVars
                                    }
                                />
                            ))}
                        </div>
                    );
                }

                if (effect.type === 'hearts' && effect.heartPieces) {
                    return (
                        <div key={effect.id} className={styles.heartsBurst}>
                            {effect.heartPieces.map((piece) => (
                                <span
                                    key={piece.id}
                                    className={styles.heartPiece}
                                    style={
                                        {
                                            '--left': piece.left,
                                            '--size': `${piece.size}px`,
                                            '--delay': `${piece.delay}s`,
                                            '--duration': `${piece.duration}s`,
                                            '--drift': `${piece.drift}px`,
                                            '--rotation': `${piece.rotation}deg`,
                                        } as EffectCssVars
                                    }
                                >
                                    {piece.glyph}
                                </span>
                            ))}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
