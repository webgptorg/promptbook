'use client';

import { useState } from 'react';
import type { DnsRecordInstruction } from '../../utils/dnsRecords/DnsRecordInstruction';

/**
 * Direct Cloudflare dashboard URL for the DNS records page.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
const CLOUDFLARE_DNS_RECORDS_URL = 'https://dash.cloudflare.com/?to=/:account/:zone/dns/records';

/**
 * DNS record types for which Cloudflare offers a proxy-status choice.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
const CLOUDFLARE_PROXYABLE_DNS_RECORD_TYPES = new Set(['A', 'AAAA', 'CNAME']);

/**
 * Stable identifiers for the Cloudflare DNS setup wizard steps.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
type CloudflareDnsWizardStep = 'open-domain' | 'add-record' | 'check-dns';

/**
 * Labels and order of the Cloudflare DNS setup wizard steps.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
const CLOUDFLARE_DNS_WIZARD_STEPS: ReadonlyArray<{
    readonly id: CloudflareDnsWizardStep;
    readonly label: string;
}> = [
    { id: 'open-domain', label: '1. Open domain' },
    { id: 'add-record', label: '2. Add record' },
    { id: 'check-dns', label: '3. Check DNS' },
];

/**
 * Guided Cloudflare instructions displayed alongside the provider-neutral DNS record table.
 *
 * The record table remains the single source of truth for the values to enter. This wizard only
 * explains how to enter those existing records in Cloudflare.
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
    readonly recordSelection: 'all' | 'one';

    /**
     * The canonical DNS records displayed by the parent instruction panel.
     */
    readonly records: ReadonlyArray<DnsRecordInstruction>;
}) {
    const [currentStep, setCurrentStep] = useState<CloudflareDnsWizardStep>('open-domain');
    const isProxyStatusRelevant = records.some((record) => CLOUDFLARE_PROXYABLE_DNS_RECORD_TYPES.has(record.type));
    const recordSelectionInstruction =
        recordSelection === 'all'
            ? `Repeat this for all ${records.length} record${records.length === 1 ? '' : 's'} shown above.`
            : 'Choose one of the record alternatives shown above.';

    return (
        <section
            aria-label="Cloudflare DNS setup"
            className="space-y-4 rounded-lg border border-amber-200 bg-white/70 p-4"
        >
            <div className="space-y-1">
                <h3 className="font-semibold">Cloudflare setup wizard</h3>
                <p className="text-xs text-amber-800">
                    Follow the steps below to add the records from this manual in Cloudflare.
                </p>
            </div>

            <CloudflareDnsWizardStepNavigation currentStep={currentStep} onStepChange={setCurrentStep} />

            {currentStep === 'open-domain' ? (
                <div className="space-y-2">
                    <p className="font-medium">Open the DNS records for your domain</p>
                    <ol className="list-decimal space-y-1 pl-5 text-amber-900">
                        <li>Sign in to Cloudflare.</li>
                        <li>
                            Select the Cloudflare zone that contains <span className="font-mono">{domain}</span>.
                        </li>
                        <li>Open DNS, then Records.</li>
                    </ol>
                    <a
                        href={CLOUDFLARE_DNS_RECORDS_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex font-semibold text-amber-700 underline decoration-amber-400 underline-offset-2 hover:text-amber-900"
                    >
                        Open Cloudflare DNS records
                    </a>
                </div>
            ) : null}

            {currentStep === 'add-record' ? (
                <div className="space-y-2">
                    <p className="font-medium">Add the record</p>
                    <ol className="list-decimal space-y-1 pl-5 text-amber-900">
                        <li>Select Add record.</li>
                        <li>{recordSelectionInstruction}</li>
                        <li>
                            Copy its Type, Name, and Value from the table above. Cloudflare calls the Value field
                            Content or Target, depending on the record type.
                        </li>
                        {isProxyStatusRelevant ? (
                            <li>
                                For A, AAAA, and CNAME records, set Proxy status to DNS only (the gray cloud). This
                                lets this page verify that the hostname resolves directly to the VPS.
                            </li>
                        ) : null}
                        <li>Select Save.</li>
                    </ol>
                </div>
            ) : null}

            {currentStep === 'check-dns' ? (
                <div className="space-y-2">
                    <p className="font-medium">Check the result</p>
                    <ol className="list-decimal space-y-1 pl-5 text-amber-900">
                        {recordSelection === 'one' ? (
                            <li>Remove conflicting A, AAAA, or CNAME records for the same hostname.</li>
                        ) : null}
                        <li>Wait for DNS propagation.</li>
                        <li>Refresh this page to check the DNS status again.</li>
                    </ol>
                </div>
            ) : null}
        </section>
    );
}

/**
 * Renders the selectable progression for the Cloudflare DNS setup wizard.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
function CloudflareDnsWizardStepNavigation({
    currentStep,
    onStepChange,
}: {
    /**
     * Step currently visible to the administrator.
     */
    readonly currentStep: CloudflareDnsWizardStep;

    /**
     * Updates the currently visible wizard step.
     */
    readonly onStepChange: (step: CloudflareDnsWizardStep) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2" aria-label="Cloudflare setup steps">
            {CLOUDFLARE_DNS_WIZARD_STEPS.map((step) => {
                const isCurrentStep = currentStep === step.id;

                return (
                    <button
                        key={step.id}
                        type="button"
                        aria-current={isCurrentStep ? 'step' : undefined}
                        onClick={() => onStepChange(step.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                            isCurrentStep
                                ? 'bg-amber-700 text-white shadow-sm'
                                : 'border border-amber-200 bg-white text-amber-800 hover:bg-amber-100'
                        }`}
                    >
                        {step.label}
                    </button>
                );
            })}
        </div>
    );
}
