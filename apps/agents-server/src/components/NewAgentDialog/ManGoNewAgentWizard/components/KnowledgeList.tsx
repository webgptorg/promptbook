import type { KnowledgeItem, KnowledgeItemStatus } from '../types';
import { cn } from '../lib/cn';
import { formatFileSize } from '../lib/format';
import { Badge } from './ui/Badge';
import { IconButton } from './ui/IconButton';
import { Spinner } from './ui/Spinner';

function StatusChip({ status }: { readonly status: KnowledgeItemStatus }) {
    if (status === 'uploading') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <Spinner className="h-3.5 w-3.5" /> Nahrávám…
            </span>
        );
    }
    if (status === 'error') {
        return <Badge tone="error">Chyba</Badge>;
    }
    return (
        <Badge tone="success" dot>
            Připraveno
        </Badge>
    );
}

type KnowledgeListProps = {
    readonly items: readonly KnowledgeItem[];
    readonly onRemove: (id: string) => void;
};

export function KnowledgeList({ items, onRemove }: KnowledgeListProps) {
    if (items.length === 0) {
        return null;
    }

    return (
        <ul className="space-y-2">
            {items.map((item) => (
                <li
                    key={item.id}
                    className={cn(
                        'group flex items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5 shadow-[var(--ob-shadow-xs)] transition-colors',
                        item.status === 'error'
                            ? 'border-red-200 bg-red-50/40'
                            : 'border-zinc-200 hover:border-zinc-300',
                    )}
                >
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-base"
                            aria-hidden
                        >
                            {item.kind === 'file' ? '📄' : '🔗'}
                        </span>
                        <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-zinc-800">
                                {item.kind === 'file' ? item.name : item.url}
                            </div>
                            {item.kind === 'file' && (
                                <div className="text-xs text-zinc-400">{formatFileSize(item.size)}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                        <StatusChip status={item.status} />
                        <IconButton
                            size="sm"
                            label="Odebrat zdroj"
                            onClick={() => onRemove(item.id)}
                            className="opacity-60 hover:text-red-600 group-hover:opacity-100"
                        >
                            ×
                        </IconButton>
                    </div>
                </li>
            ))}
        </ul>
    );
}
