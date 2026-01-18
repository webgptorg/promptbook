'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import styles from '../ChatEffectsSystem.module.css';

type HeartsEffectProps = {
    triggerKey: number;
};

type HeartParticle = {
    id: string;
    left: number;
    size: number;
    delay: number;
    duration: number;
    drift: number;
    emoji: string;
};

const HEART_PARTICLES = ['❤', '💖', '💗', '💓', '💘', '💝', '💞', '💕', '💜'];

export function HeartsEffect({ triggerKey }: HeartsEffectProps) {
    const [bursts, setBursts] = useState<Array<{ id: string; particles: HeartParticle[] }>>([]);

    useEffect(() => {
        if (!triggerKey) {
            return;
        }

        const burstId = `hearts-${triggerKey}-${Date.now()}`;
        const particleCount = 18;

        const particles = Array.from({ length: particleCount }, (_, index) => ({
            id: `${burstId}-${index}`,
            left: Math.random() * 100,
            size: 16 + Math.random() * 16,
            delay: Math.random() * 250,
            duration: 1600 + Math.random() * 1200,
            drift: (Math.random() - 0.5) * 120,
            emoji: HEART_PARTICLES[Math.floor(Math.random() * HEART_PARTICLES.length)]!,
        }));

        setBursts((prev) => [...prev, { id: burstId, particles }]);

        const maxLifetime = Math.max(...particles.map((particle) => particle.delay + particle.duration));
        const timer = window.setTimeout(() => {
            setBursts((prev) => prev.filter((burst) => burst.id !== burstId));
        }, maxLifetime);

        return () => {
            window.clearTimeout(timer);
        };
    }, [triggerKey]);

    if (bursts.length === 0) {
        return null;
    }

    return (
        <div className={styles.effectLayer}>
            {bursts.flatMap((burst) =>
                burst.particles.map((particle) => {
                    const style = {
                        left: `${particle.left}%`,
                        fontSize: `${particle.size}px`,
                        animationDelay: `${particle.delay}ms`,
                        animationDuration: `${particle.duration}ms`,
                        '--heart-drift': `${particle.drift}px`,
                    } as CSSProperties;

                    return (
                        <span key={particle.id} className={styles.heartParticle} style={style}>
                            {particle.emoji}
                        </span>
                    );
                }),
            )}
        </div>
    );
}
