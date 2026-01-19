'use client';

import { useEffect, useRef, useState } from 'react';
import { ConfettiEffect } from './components/ConfettiEffect';
import { HeartsEffect } from './components/HeartsEffect';
import type { ChatEffect } from './types/ChatEffect';
import type { ChatEffectsSystemProps } from './types/ChatEffectsSystemProps';
import { detectEffects } from './utils/detectEffects';

/**
 * ChatEffectsSystem component
 * Monitors chat messages and triggers visual effects based on emoji content
 *
 * This component:
 * - Tracks which messages have already been processed
 * - Detects emojis in new agent messages
 * - Triggers appropriate effects (confetti, hearts, etc.)
 * - Handles effect lifecycle (creation, completion, cleanup)
 *
 * @public exported from `@promptbook/components`
 */
export function ChatEffectsSystem(props: ChatEffectsSystemProps) {
    const { messages, effectConfigs, shouldTriggerEffect, className } = props;

    const [activeEffects, setActiveEffects] = useState<ChatEffect[]>([]);
    const processedMessageIds = useRef(new Set<string>());

    useEffect(() => {
        if (messages.length === 0) {
            return;
        }

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) {
            return;
        }

        const messageId = lastMessage.id || lastMessage.content;

        if (processedMessageIds.current.has(messageId)) {
            return;
        }

        const shouldTrigger = shouldTriggerEffect ? shouldTriggerEffect(lastMessage) : lastMessage.sender !== 'USER';

        if (!shouldTrigger) {
            processedMessageIds.current.add(messageId);
            return;
        }

        if (!lastMessage.isComplete) {
            return;
        }

        const effectTypes = detectEffects(lastMessage, effectConfigs);

        if (effectTypes.length === 0) {
            processedMessageIds.current.add(messageId);
            return;
        }

        const newEffects: ChatEffect[] = effectTypes.map((type) => ({
            id: `${type}-${Date.now()}-${Math.random()}`,
            type,
            timestamp: Date.now(),
        }));

        setActiveEffects((prev) => [...prev, ...newEffects]);
        processedMessageIds.current.add(messageId);
    }, [messages, effectConfigs, shouldTriggerEffect]);

    const handleEffectComplete = (effectId: string) => {
        setActiveEffects((prev) => prev.filter((effect) => effect.id !== effectId));
    };

    return (
        <div className={className}>
            {activeEffects.map((effect) => {
                switch (effect.type) {
                    case 'CONFETTI':
                        return (
                            <ConfettiEffect
                                key={effect.id}
                                effectId={effect.id}
                                onComplete={() => handleEffectComplete(effect.id)}
                            />
                        );
                    case 'HEARTS':
                        return (
                            <HeartsEffect
                                key={effect.id}
                                effectId={effect.id}
                                onComplete={() => handleEffectComplete(effect.id)}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
}
