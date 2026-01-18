'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import styles from '../ChatEffectsSystem.module.css';

type ConfettiEffectProps = {
    triggerKey: number;
};

type ConfettiParticle = {
    id: string;
    left: number;
    size: number;
    color: string;
    delay: number;
    duration: number;
    drift: number;
    rotation: number;
    isRound: boolean;
};

const CONFETTI_COLORS = ['#f97316', '#f43f5e', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#14b8a6'];

export function ConfettiEffect({ triggerKey }: ConfettiEffectProps) {
    const [bursts, setBursts] = useState<Array<{ id: string; particles: ConfettiParticle[] }>>([]);

    useEffect(() => {
        if (!triggerKey) {
            return;
        }

        const burstId = `confetti-${triggerKey}-${Date.now()}`;
        const particleCount = 70;

        const particles = Array.from({ length: particleCount }, (_, index) => {
            const size = 6 + Math.random() * 8;
            return {
                id: `${burstId}-${index}`,
                left: Math.random() * 100,
                size,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
                delay: Math.random() * 200,
                duration: 1400 + Math.random() * 900,
                drift: (Math.random() - 0.5) * 140,
                rotation: Math.random() * 360,
                isRound: Math.random() > 0.7,
            };
        });

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
                        width: `${particle.size}px`,
                        height: `${particle.size * 1.3}px`,
                        backgroundColor: particle.color,
                        animationDelay: `${particle.delay}ms`,
                        animationDuration: `${particle.duration}ms`,
                        borderRadius: particle.isRound ? '50%' : '2px',
                        '--confetti-drift': `${particle.drift}px`,
                        '--confetti-rotation': `${particle.rotation}deg`,
                    } as CSSProperties;

                    return <span key={particle.id} className={styles.confettiPiece} style={style} />;
                }),
            )}
        </div>
    );
}
