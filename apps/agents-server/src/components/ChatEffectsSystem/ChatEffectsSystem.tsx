'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, ChatParticipant } from '@promptbook-local/components';
import { ConfettiEffect } from './effects/ConfettiEffect';
import { HeartsEffect } from './effects/HeartsEffect';
import styles from './ChatEffectsSystem.module.css';

type ChatEffectsSystemProps = {
    messages: ReadonlyArray<ChatMessage>;
    participants?: ReadonlyArray<ChatParticipant>;
};

const CONFETTI_EMOJI = '🎉';
const CONFETTI_ALIASES = [':tada:', ':party_popper:'];
const HEART_EMOJIS = [
    '♥',
    '♥️',
    '♡',
    '❤',
    '❤️',
    '❣',
    '❣️',
    '💖',
    '💗',
    '💓',
    '💘',
    '💝',
    '💞',
    '💕',
    '💟',
    '💔',
    '💜',
    '💙',
    '💚',
    '💛',
    '🧡',
    '🩵',
    '🩶',
    '🩷',
    '🤎',
    '🤍',
    '🖤',
];
const HEART_ALIASES = [
    '<3',
    ':heart:',
    ':hearts:',
    ':sparkling_heart:',
    ':heartpulse:',
    ':heartbeat:',
    ':blue_heart:',
    ':green_heart:',
    ':yellow_heart:',
    ':purple_heart:',
    ':black_heart:',
    ':orange_heart:',
    ':brown_heart:',
    ':white_heart:',
    ':pink_heart:',
    ':grey_heart:',
    ':gray_heart:',
    ':heart_on_fire:',
    ':mending_heart:',
];

function includesAny(haystack: string, tokens: ReadonlyArray<string>): boolean {
    return tokens.some((token) => haystack.includes(token));
}

function getMessageKey(message: ChatMessage, index: number): string {
    if (message.id) {
        return String(message.id);
    }

    if (message.createdAt) {
        const timestamp = new Date(message.createdAt).getTime();
        return `${message.sender}-${timestamp}`;
    }

    return `${message.sender}-${index}`;
}

export function ChatEffectsSystem({ messages, participants = [] }: ChatEffectsSystemProps) {
    const [confettiTrigger, setConfettiTrigger] = useState(0);
    const [heartsTrigger, setHeartsTrigger] = useState(0);

    const isBootstrappedRef = useRef(false);
    const bootstrapMessageKeysRef = useRef<Set<string>>(new Set());
    const completionStateRef = useRef<Map<string, boolean>>(new Map());
    const triggeredEffectsRef = useRef<Map<string, { confetti: boolean; hearts: boolean }>>(new Map());

    const participantMap = useMemo(() => {
        const map = new Map<string, ChatParticipant>();
        for (const participant of participants) {
            map.set(participant.name, participant);
        }
        return map;
    }, [participants]);

    useEffect(() => {
        const keyedMessages = messages.map((message, index) => ({
            message,
            key: getMessageKey(message, index),
        }));

        // Skip effects for messages present on initial render (page load/refresh).
        if (!isBootstrappedRef.current) {
            for (const { message, key } of keyedMessages) {
                bootstrapMessageKeysRef.current.add(key);
                completionStateRef.current.set(key, message.isComplete !== false);
            }
            isBootstrappedRef.current = true;
            return;
        }

        for (const { message, key } of keyedMessages) {
            const wasKnown = completionStateRef.current.has(key);
            const wasComplete = completionStateRef.current.get(key);
            const isComplete = message.isComplete !== false;

            completionStateRef.current.set(key, isComplete);

            if (bootstrapMessageKeysRef.current.has(key)) {
                continue;
            }

            if (!isComplete) {
                continue;
            }

            const shouldEvaluate = !wasKnown || wasComplete === false;
            if (!shouldEvaluate) {
                continue;
            }

            const participant = participantMap.get(message.sender);
            const isFromUser = participant ? participant.isMe === true : message.sender === 'USER';
            if (isFromUser) {
                continue;
            }

            const content = message.content || '';
            const normalizedContent = content.toLowerCase();
            const hasConfetti =
                content.includes(CONFETTI_EMOJI) || includesAny(normalizedContent, CONFETTI_ALIASES);
            const hasHeart =
                HEART_EMOJIS.some((emoji) => content.includes(emoji)) ||
                includesAny(normalizedContent, HEART_ALIASES);

            if (!hasConfetti && !hasHeart) {
                continue;
            }

            const triggered = triggeredEffectsRef.current.get(key) || { confetti: false, hearts: false };

            if (hasConfetti && !triggered.confetti) {
                setConfettiTrigger((value) => value + 1);
                triggered.confetti = true;
            }

            if (hasHeart && !triggered.hearts) {
                setHeartsTrigger((value) => value + 1);
                triggered.hearts = true;
            }

            triggeredEffectsRef.current.set(key, triggered);
        }
    }, [messages, participantMap]);

    return (
        <div className={styles.effectsOverlay} aria-hidden="true">
            <ConfettiEffect triggerKey={confettiTrigger} />
            <HeartsEffect triggerKey={heartsTrigger} />
        </div>
    );
}
