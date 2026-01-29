'use client';

import { useEffect, useState } from 'react';
import styles from './ConfettiEffect.module.css';

type ConfettiParticle = {
    id: number;
    left: number;
    delay: number;
    duration: number;
    color: string;
    rotation: number;
};
// <- TODO: !!!!!!!! AI Rules: Use types not interfaces

type ConfettiEffectProps = {
    /**
     * Unique identifier for this effect instance
     */
    effectId: string;

    /**
     * Callback when the effect completes
     */
    onComplete?: () => void;
};

const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
const PARTICLE_COUNT = 50;
const EFFECT_DURATION = 3000;

/**
 * Confetti effect component
 * Renders falling confetti particles from the top of the screen
 *
 * @public exported from `@promptbook/components`
 */
export function ConfettiEffect(props: ConfettiEffectProps) {
    const { effectId, onComplete } = props;
    const [particles, setParticles] = useState<ConfettiParticle[]>([]);

    useEffect(() => {
        const newParticles: ConfettiParticle[] = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            newParticles.push({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 500,
                duration: 2000 + Math.random() * 1000,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
                rotation: Math.random() * 360,
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
        <div className={styles.confettiContainer}>
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className={styles.confettiParticle}
                    style={{
                        left: `${particle.left}%`,
                        animationDelay: `${particle.delay}ms`,
                        animationDuration: `${particle.duration}ms`,
                        backgroundColor: particle.color,
                        transform: `rotate(${particle.rotation}deg)`,
                    }}
                />
            ))}
        </div>
    );
}
