import Image from 'next/image';
import logoImage from '@public/logo-white-transparent-1024.png';
import { HarnessLogo } from '@/components/HarnessLogo/HarnessLogo';
import type { ComparisonColumnDefinition } from '@/data/comparison';

/**
 * Props of `<ComparisonSolutionLogo/>`.
 */
type ComparisonSolutionLogoProps = {
    /**
     * Column of the comparison table whose logo is drawn
     */
    readonly column: ComparisonColumnDefinition;
};

/**
 * Renders the logo tile of one compared solution - the Promptbook mark for `ptbk coder`
 * and the harness mark for every agent it drives.
 */
export function ComparisonSolutionLogo({ column }: ComparisonSolutionLogoProps) {
    if (column.harness !== null) {
        return <HarnessLogo harnessName={column.harness.harnessName} accentColor={column.harness.accentColor} />;
    }

    return (
        <span
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-promptbook-blue-dark/60 bg-gray-900"
            aria-hidden
        >
            <Image src={logoImage} alt="" width={28} height={28} />
        </span>
    );
}
