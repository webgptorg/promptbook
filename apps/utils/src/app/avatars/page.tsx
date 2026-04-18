import Link from 'next/link';
import { AvatarPlaygroundPage } from './AvatarPlaygroundPage';

/**
 * Renders the avatars utility page.
 */
export default function AvatarsPage() {
    return (
        <AvatarPlaygroundPage
            title="Avatars"
            description={
                <>
                    <Link href="https://ptbk.io/" className="underline">
                        Promptbook
                    </Link>{' '}
                    utility for testing deterministic AI agent avatars rendered entirely on canvas.
                </>
            }
        />
    );
}
