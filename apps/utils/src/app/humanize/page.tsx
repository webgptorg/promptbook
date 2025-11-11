import logoImage from '@/public/logo-blue-white-256.png';
import Image from 'next/image';
import Link from 'next/link';
import { HumanizeAiTextComponent } from './HumanizeAiTextComponent';

export default function HumanizeAiTextPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="h-full container mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    <Image src={logoImage} alt="Promptbook Logo" height={40} className="inline-block mr-4" />
                    Humanize AI Text
                </h1>
                <p className="text-xl text-gray-600 mb-12">
                    <Link href="https://ptbk.io/" className="underline">
                        Promptbook
                    </Link>{' '}
                    utility to make AI-generated text sound more natural and human-like.
                </p>

                <HumanizeAiTextComponent />
            </div>
        </div>
    );
}
