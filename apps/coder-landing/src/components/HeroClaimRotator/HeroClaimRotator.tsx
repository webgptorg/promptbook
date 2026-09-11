'use client';

import { useEffect, useState } from 'react';
import { HERO_CLAIMS } from '@/data/heroClaims';

/**
 * How long one hero claim stays in the headline before the next one takes over, in milliseconds.
 */
const HERO_CLAIM_VISIBLE_DURATION_MS = 4200;

/**
 * Media query which reports whether the visitor asked their system for less motion.
 */
const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * CSS classes of one claim in each of its three rotation states.
 *
 * Note: The claim which just left rises out of the headline while every claim which still waits rests
 *       below it, so the whole rotation reads as one continuous upward movement.
 */
const HERO_CLAIM_STATE_CLASS_NAMES = {
    active: 'translate-y-0 opacity-100',
    leaving: '-translate-y-6 opacity-0 select-none',
    waiting: 'translate-y-6 opacity-0 select-none',
} as const;

/**
 * Renders the hero headline which rotates through every configured claim.
 *
 * All claims are stacked in the very same grid cell, so the headline is always as tall as the tallest
 * of them and the rotation never shifts the layout around it. The claim which leaves rises out of the
 * headline while the next one rises into it from below, and visitors whose system prefers reduced
 * motion keep the primary claim without any rotation.
 *
 * Note: Specified in [`specs/sections/hero.md`](../../../specs/sections/hero.md)
 */
export function HeroClaimRotator() {
    const [activeClaimIndex, setActiveClaimIndex] = useState(0);

    useEffect(() => {
        if (window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches) {
            return;
        }

        const intervalId = window.setInterval(() => {
            setActiveClaimIndex((currentClaimIndex) => (currentClaimIndex + 1) % HERO_CLAIMS.length);
        }, HERO_CLAIM_VISIBLE_DURATION_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    return (
        <h1 className="grid font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl xl:text-[3.25rem]">
            {HERO_CLAIMS.map((heroClaim, claimIndex) => (
                <span
                    key={claimIndex}
                    aria-hidden={claimIndex !== activeClaimIndex}
                    className={`col-start-1 row-start-1 transition-all duration-700 ease-out ${resolveHeroClaimStateClassNames(
                        claimIndex,
                        activeClaimIndex,
                    )}`}
                >
                    {/* Note: A claim longer than the column wraps into even lines instead of leaving one trailing word */}
                    <span className="block text-balance">{heroClaim.leadLine}</span>
                    <span className="block bg-gradient-to-r from-promptbook-blue to-promptbook-green bg-clip-text text-balance text-transparent">
                        {heroClaim.accentLine}
                    </span>
                </span>
            ))}
        </h1>
    );
}

/**
 * Resolves the CSS classes of one claim in its current rotation state.
 *
 * @param claimIndex Position of the claim in the rotation.
 * @param activeClaimIndex Position of the claim currently shown in the headline.
 * @returns CSS classes of the requested claim.
 */
function resolveHeroClaimStateClassNames(claimIndex: number, activeClaimIndex: number): string {
    if (claimIndex === activeClaimIndex) {
        return HERO_CLAIM_STATE_CLASS_NAMES.active;
    }

    const leavingClaimIndex = (activeClaimIndex + HERO_CLAIMS.length - 1) % HERO_CLAIMS.length;

    return claimIndex === leavingClaimIndex
        ? HERO_CLAIM_STATE_CLASS_NAMES.leaving
        : HERO_CLAIM_STATE_CLASS_NAMES.waiting;
}
