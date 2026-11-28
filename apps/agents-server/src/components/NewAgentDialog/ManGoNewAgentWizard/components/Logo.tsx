import Image from 'next/image';

import { cn } from '../lib/cn';

/**
 * Official Promptbook logo (symbol PNG from the brand kit) + wordmark in Outfit.
 * Per the brand rules the mark itself is never recolored — we only switch between the
 * provided variants: `white` for dark surfaces, `blue` for light ones.
 */
export function Logo({ variant = 'white', className }: { readonly variant?: 'white' | 'blue'; readonly className?: string }) {
    const src = variant === 'white' ? '/promptbook-logo-white.png' : '/promptbook-logo-blue.png';
    return (
        <span className={cn('inline-flex select-none items-center gap-2 text-lg tracking-tight', className)}>
            <Image src={src} alt="Promptbook" width={28} height={28} className="h-7 w-7" />
            <span className="ob-display font-medium">
                Prompt<b className="font-semibold">book</b>
            </span>
        </span>
    );
}
