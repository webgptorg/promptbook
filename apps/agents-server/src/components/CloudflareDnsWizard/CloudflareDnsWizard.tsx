'use client';

import { useState } from 'react';
import type { DnsRecordInstruction, DnsRecordSelection } from '../../utils/dnsRecords/DnsRecordInstruction';
import { resolveDnsRecordBatchPlan } from '../../utils/dnsRecords/resolveDnsRecordBatchPlan';
import { CloudflareDnsApiTokenImportStep } from './CloudflareDnsApiTokenImportStep';
import { CloudflareDnsCheckStep } from './CloudflareDnsCheckStep';
import { CloudflareDnsManualStep } from './CloudflareDnsManualStep';
import { CloudflareDnsWizardStepNavigation } from './CloudflareDnsWizardStepNavigation';
import { CLOUDFLARE_DNS_WIZARD_STEPS, type CloudflareDnsWizardStep } from './CloudflareDnsWizardSteps';
import { CloudflareDnsZoneFileImportStep } from './CloudflareDnsZoneFileImportStep';

/**
 * Guided Cloudflare instructions displayed alongside the provider-neutral DNS record table.
 *
 * The record table remains the single source of truth for the values to configure. This wizard adds the two batch
 * ways of configuring all of them at once - an API token import and a zone file import - and keeps the manual steps
 * as a fallback.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export function CloudflareDnsWizard({
    domain,
    recordSelection,
    records,
}: {
    /**
     * Hostname whose DNS records are being configured.
     */
    readonly domain: string;

    /**
     * Whether all listed records or one listed alternative must be configured.
     */
    readonly recordSelection: DnsRecordSelection;

    /**
     * The canonical DNS records displayed by the parent instruction panel.
     */
    readonly records: ReadonlyArray<DnsRecordInstruction>;
}) {
    const batchPlan = resolveDnsRecordBatchPlan({ records, recordSelection });
    const isBatchImportAvailable = batchPlan.applicableRecords.length > 0;
    const availableSteps = CLOUDFLARE_DNS_WIZARD_STEPS.filter((step) => isBatchImportAvailable || !step.isBatchStep);
    const [currentStep, setCurrentStep] = useState<CloudflareDnsWizardStep>(
        isBatchImportAvailable ? 'import-with-api-token' : 'add-manually',
    );

    return (
        <section
            aria-label="Cloudflare DNS setup"
            className="space-y-4 rounded-lg border border-amber-200 bg-white/70 p-4"
        >
            <div className="space-y-1">
                <h3 className="font-semibold">Cloudflare setup wizard</h3>
                <p className="text-xs text-amber-800">
                    {isBatchImportAvailable
                        ? 'Add all records from this manual to Cloudflare at once, or add them one by one.'
                        : 'Follow the steps below to add the records from this manual in Cloudflare.'}
                </p>
            </div>

            <CloudflareDnsWizardStepNavigation
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                steps={availableSteps}
            />

            {currentStep === 'import-with-api-token' ? (
                <CloudflareDnsApiTokenImportStep
                    batchPlan={batchPlan}
                    domain={domain}
                    recordSelection={recordSelection}
                />
            ) : null}

            {currentStep === 'import-zone-file' ? (
                <CloudflareDnsZoneFileImportStep batchPlan={batchPlan} domain={domain} />
            ) : null}

            {currentStep === 'add-manually' ? (
                <CloudflareDnsManualStep domain={domain} recordSelection={recordSelection} records={records} />
            ) : null}

            {currentStep === 'check-dns' ? <CloudflareDnsCheckStep recordSelection={recordSelection} /> : null}
        </section>
    );
}
