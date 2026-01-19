'use client';

import { useEffect, useState } from 'react';
import styles from './HeartsEffect.module.css';

type HeartParticle = {
    id: number;
    left: number;
    delay: number;
    duration: number;
    emoji: string;
    scale: number;
};

type HeartsEffectProps = {
    /**
     * Unique identifier for this effect instance
     */
    effectId: string;

    /**
     * Callback when the effect completes
     */
    onComplete?: () => void;
};

const HEART_EMOJIS = ['❤️', '💙', '💚', '💛', '💜', '🧡', '💖', '💗', '💕', '💓'];
const PARTICLE_COUNT = 20;
const EFFECT_DURATION = 3000;

/**
 * Hearts effect component
 * Renders floating hearts that rise from the bottom of the screen
 *
 * @public exported from `@promptbook/components`
 */
export function HeartsEffect(props: HeartsEffectProps) {
    const { effectId, onComplete } = props;
    const [particles, setParticles] = useState<HeartParticle[]>([]);

    useEffect(() => {
        const newParticles: HeartParticle[] = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            newParticles.push({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 500,
                duration: 2000 + Math.random() * 1000,
                emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)]!,
                scale: 0.8 + Math.random() * 0.6,
            });
        }
        setParticles(newParticles);

        const timer = setTimeout(() => {
            if (onComplete) {
                onComplete();
            }
        }, EFFECT_DURATION);

        return () => clearTimeout(timer);
    }, [effectId, onComplete]);

    return (
        <div className={styles.heartsContainer}>
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className={styles.heartParticle}
                    style={{
                        left: `${particle.left}%`,
                        animationDelay: `${particle.delay}ms`,
                        animationDuration: `${particle.duration}ms`,
                        fontSize: `${particle.scale * 2}rem`,
                    }}
                >
                    {particle.emoji}
                </div>
            ))}
        </div>
    );
}
