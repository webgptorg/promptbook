'use client';

import { ONBOARDING_STEPS } from '../../config/steps';
import { createId } from '../../lib/id';
import { useManGoOnboardingNavigation } from '../../ManGoOnboardingNavigation';
import { useOnboarding } from '../../state/OnboardingProvider';
import { cn } from '../../lib/cn';
import { DropZone } from '../DropZone';
import { KnowledgeList } from '../KnowledgeList';
import { StepCard, StepFooter, StepHeader } from '../StepFrame';
import { Button } from '../ui/Button';
import { CONTROL, CONTROL_ERROR } from '../ui/Field';

/** Maximum size accepted by the knowledge uploader. */
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Normalizes one deliberately supplied URL. */
function normalizeUrl(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) {
        return null;
    }
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        return new URL(withProtocol).href;
    } catch {
        return null;
    }
}

/** Collects knowledge associations belonging only to the active session. */
export function KnowledgeStep() {
    const { navigateToPath } = useManGoOnboardingNavigation();
    const { state, update, actions } = useOnboarding();
    const urlInput = state.knowledgeUrlInput;
    const urlError = state.knowledgeUrlError;

    /** Starts valid uploads without superseding other files in this draft. */
    function handleFiles(files: readonly File[]) {
        files.filter((file) => file.size <= MAX_FILE_SIZE_BYTES).forEach((file) => void actions.uploadFile(file));
    }

    /** Adds one deliberately supplied URL to this draft. */
    function handleAddUrl() {
        const normalized = normalizeUrl(urlInput);
        if (!normalized) {
            update({ knowledgeUrlError: 'Zadejte platnou adresu, např. https://firma.cz/napoveda' });
            return;
        }
        update((prev) => ({
            knowledge: [...prev.knowledge, { kind: 'url', id: createId(), url: normalized, status: 'ready' }],
            knowledgeUrlInput: '',
            knowledgeUrlError: null,
        }));
    }

    return (
        <div className="mx-auto max-w-2xl">
            <StepHeader
                eyebrow="Znalostní báze"
                title="Přidejte znalosti agenta"
                subtitle="Agent čerpá odpovědi ze souborů a odkazů, které mu dáte. Čím relevantnější materiály, tím přesnější výstupy."
            />

            <StepCard className="space-y-6">
                <DropZone onFiles={handleFiles} hint="PDF, DOCX, TXT, XLSX · max. 25 MB na soubor" />

                <KnowledgeList items={state.knowledge} onRemove={actions.removeKnowledge} />

                <div className="border-t border-zinc-100 pt-6">
                    <label htmlFor="knowledge-url" className="mb-1.5 block text-[13px] font-semibold text-zinc-700">
                        Nebo přidejte odkaz na web / dokumentaci
                    </label>
                    <div className="flex gap-2.5">
                        <input
                            id="knowledge-url"
                            type="text"
                            value={urlInput}
                            placeholder="https://firma.cz/napoveda"
                            aria-invalid={urlError ? true : undefined}
                            onChange={(event) =>
                                update({ knowledgeUrlInput: event.target.value, knowledgeUrlError: null })
                            }
                            onKeyDown={(event) => event.key === 'Enter' && handleAddUrl()}
                            className={cn(CONTROL, urlError && CONTROL_ERROR)}
                        />
                        <Button
                            variant="outline"
                            onClick={handleAddUrl}
                            className="whitespace-nowrap"
                            leadingIcon={<span aria-hidden>+</span>}
                        >
                            Přidat
                        </Button>
                    </div>
                    {urlError ? (
                        <p className="mt-1 text-xs text-red-600">{urlError}</p>
                    ) : (
                        <p className="mt-1 text-xs text-zinc-400">
                            Agent si stránku přečte a zahrne do znalostní báze.
                        </p>
                    )}
                </div>
            </StepCard>

            <StepFooter
                left={
                    <Button variant="ghost" onClick={() => navigateToPath(ONBOARDING_STEPS[0].path)}>
                        ← Book
                    </Button>
                }
                right={
                    <Button
                        trailingIcon={<span aria-hidden>→</span>}
                        onClick={() => navigateToPath(ONBOARDING_STEPS[2].path)}
                    >
                        Pokračovat: Test
                    </Button>
                }
            />
        </div>
    );
}
