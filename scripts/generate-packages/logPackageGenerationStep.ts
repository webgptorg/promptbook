import colors from 'colors';

/**
 * Logs one numbered package-generation phase header in a consistent style.
 *
 * @param stepLabel - Step label shown in the console
 * @private function of generatePackages
 */
export function logPackageGenerationStep(stepLabel: string): void {
    console.info(colors.cyan(stepLabel));
}

// Note: [⚫] Code for repository script [logPackageGenerationStep](scripts/generate-packages/logPackageGenerationStep.ts) should never be published in any package
