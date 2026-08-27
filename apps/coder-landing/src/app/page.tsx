import { AgentsSection } from '@/components/sections/AgentsSection';
import { ComparisonSection } from '@/components/sections/ComparisonSection';
import { FeaturesSection } from '@/components/sections/FeaturesSection';
import { Footer } from '@/components/sections/Footer';
import { HarnessesSection } from '@/components/sections/HarnessesSection';
import { Header } from '@/components/sections/Header';
import { Hero } from '@/components/sections/Hero';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Quickstart } from '@/components/sections/Quickstart';
import { StructuredData } from '@/components/StructuredData/StructuredData';

/**
 * Handles the `ptbk coder` landing page.
 *
 * Note: The section order is specified in [`specs/page-structure.md`](../../specs/page-structure.md)
 */
export default function HomePage() {
    return (
        <>
            <StructuredData />
            <Header />
            <main>
                <Hero />
                <HowItWorks />
                <Quickstart />
                <AgentsSection />
                <HarnessesSection />
                <FeaturesSection />
                <ComparisonSection />
            </main>
            <Footer />
        </>
    );
}
