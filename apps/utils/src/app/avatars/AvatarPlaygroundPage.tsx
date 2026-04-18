import logoImage from '@/public/logo-blue-white-256.png';
import Image from 'next/image';
import { Suspense, type ReactNode } from 'react';
import type { AvatarVisualId } from '../../../../../src/avatars';
import { AvatarPlaygroundComponent } from './AvatarPlaygroundComponent';

/**
 * Props for the shared avatar playground page shell.
 */
type AvatarPlaygroundPageProps = {
    readonly title: string;
    readonly description: ReactNode;
    readonly defaultVisualId?: AvatarVisualId;
};

/**
 * Renders the shared page chrome around the avatar playground.
 */
export function AvatarPlaygroundPage(props: AvatarPlaygroundPageProps) {
    const { title, description, defaultVisualId } = props;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="h-full container mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    <Image src={logoImage} alt="Promptbook Logo" height={40} className="inline-block mr-4" />
                    {title}
                </h1>
                <p className="text-xl text-gray-600 mb-12">{description}</p>

                <Suspense fallback={null}>
                    <AvatarPlaygroundComponent defaultVisualId={defaultVisualId} />
                </Suspense>
            </div>
        </div>
    );
}
