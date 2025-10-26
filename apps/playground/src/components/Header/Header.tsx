import Link from 'next/link';

export function Header({ backHref, backTitle }: { backHref: string; backTitle: string }) {
    return (
        <div className="mb-8">
            <Link href={backHref} legacyBehavior>
                <a className="text-blue-600 hover:underline">← {backTitle}</a>
            </Link>
        </div>
    );
}
