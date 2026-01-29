import logoImage from '@/public/logo-blue-white-256.png';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { LinguisticHashComponent } from './LinguisticHashComponent';

export default function LinguisticHashPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="h-full container mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    <Image src={logoImage} alt="Promptbook Logo" height={40} className="inline-block mr-4" />
                    Linguistic Hash
                </h1>
                <p className="text-xl text-gray-600 mb-12">
                    <Link href="https://ptbk.io/" className="underline">
                        Promptbook
                    </Link>{' '}
                    utility to create human-readable hashes.
                </p>

                <Suspense fallback={<div>Loading...</div>}>
                    <LinguisticHashComponent />
                </Suspense>
            </div>
        </div>
    );
}
