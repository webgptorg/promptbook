import { Skeleton } from './Skeleton';

/**
 * Number of visual asset cards rendered by the gallery skeleton.
 */
const GALLERY_CARD_COUNT = 4;

/**
 * Placeholder matching the dark visual gallery used by agent asset pages.
 */
export function AgentGalleryLoadingSkeleton() {
    const galleryCards = Array.from({ length: GALLERY_CARD_COUNT }, (_unused, cardIndex) => cardIndex);

    return (
        <div
            className="min-h-screen bg-[#030510] px-4 py-10 md:px-6 md:py-12"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading image gallery"
        >
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
                <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-8 shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
                    <Skeleton className="h-4 w-40 rounded-md bg-white/10" />
                    <Skeleton className="mt-4 h-12 w-2/3 rounded-2xl bg-white/10" />
                    <Skeleton className="mt-5 h-4 w-4/5 rounded-lg bg-white/10" />
                </section>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {galleryCards.map((cardIndex) => (
                        <article
                            key={cardIndex}
                            className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                        >
                            <div className="relative border-b border-white/5 p-4">
                                <Skeleton className="h-56 w-full rounded-[18px] bg-white/10" />
                                <div className="absolute left-7 top-7">
                                    <Skeleton className="h-7 w-24 rounded-full bg-white/15" />
                                </div>
                            </div>
                            <div className="space-y-3 p-5">
                                <Skeleton className="h-7 w-2/3 rounded-xl bg-white/10" />
                                <Skeleton className="h-4 w-full rounded-lg bg-white/10" />
                                <Skeleton className="h-4 w-4/5 rounded-lg bg-white/10" />
                                <div className="flex items-center justify-between gap-4 pt-2">
                                    <Skeleton className="h-4 w-20 rounded-md bg-white/10" />
                                    <Skeleton className="h-10 w-28 rounded-xl bg-white/15" />
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
}
