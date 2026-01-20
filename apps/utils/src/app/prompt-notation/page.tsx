import logoImage from '@/public/logo-blue-white-256.png';
import Image from 'next/image';
import Link from 'next/link';
import { PromptNotationComponent } from './PromptNotationComponent';

export default function PromptNotationPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="h-full container mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    <Image src={logoImage} alt="Promptbook Logo" height={40} className="inline-block mr-4" />
                    Prompt Notation
                </h1>
                <p className="text-xl text-gray-600 mb-12">
                    <Link href="https://ptbk.io/" className="underline">
                        Promptbook
                    </Link>{' '}
                    utility to safely embed variables in prompts while protecting against prompt injection attacks.
                </p>

                <PromptNotationComponent />
            </div>
        </div>
    );
}
