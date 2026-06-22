import { cn } from '../../lib/cn';

export function Spinner({ className }: { readonly className?: string }) {
    return (
        <span
            role="status"
            aria-label="Načítání"
            className={cn(
                'inline-block animate-spin rounded-full border-2 border-zinc-200 border-t-[color:var(--ob-accent-600)]',
                className ?? 'h-5 w-5',
            )}
        />
    );
}
