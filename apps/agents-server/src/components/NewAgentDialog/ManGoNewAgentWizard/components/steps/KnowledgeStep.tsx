'use client';

import { useState } from 'react';

import { ONBOARDING_STEPS } from '../../config/steps';
import { createId } from '../../lib/id';
import { uploadKnowledgeFile } from '../../services/uploadService';
import { useManGoOnboardingNavigation } from '../../ManGoOnboardingNavigation';
import { useOnboarding } from '../../state/OnboardingProvider';
import type { KnowledgeFileItem } from '../../types';
import { cn } from '../../lib/cn';
import { DropZone } from '../DropZone';
import { KnowledgeList } from '../KnowledgeList';
import { StepCard, StepFooter, StepHeader } from '../StepFrame';
import { Button } from '../ui/Button';
import { CONTROL, CONTROL_ERROR } from '../ui/Field';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

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

export function KnowledgeStep() {
    const { navigateToPath } = useManGoOnboardingNavigation();
    const { state, update } = useOnboarding();
    const [urlInput, setUrlInput] = useState('');
    const [urlError, setUrlError] = useState<string | null>(null);

    function uploadOne(file: File) {
        const id = createId();
        const item: KnowledgeFileItem = {
            kind: 'file',
            id,
            name: file.name,
            size: file.size,
            publicUrl: '',
            objectKey: '',
            status: 'uploading',
        };
        update((prev) => ({ knowledge: [...prev.knowledge, item] }));

        uploadKnowledgeFile(file)
            .then(({ publicUrl, objectKey }) => {
                update((prev) => ({
                    knowledge: prev.knowledge.map((entry) =>
                        entry.id === id ? { ...entry, publicUrl, objectKey, status: 'ready' } : entry,
                    ),
                }));
            })
            .catch(() => {
                update((prev) => ({
                    knowledge: prev.knowledge.map((entry) =>
                        entry.id === id ? { ...entry, status: 'error' } : entry,
                    ),
                }));
            });
    }

    function handleFiles(files: readonly File[]) {
        files.filter((file) => file.size <= MAX_FILE_SIZE_BYTES).forEach(uploadOne);
    }

    function handleAddUrl() {
        const normalized = normalizeUrl(urlInput);
        if (!normalized) {
            setUrlError('Zadejte platnou adresu, např. https://firma.cz/napoveda');
            return;
        }
        setUrlError(null);
        setUrlInput('');
        update((prev) => ({
            knowledge: [...prev.knowledge, { kind: 'url', id: createId(), url: normalized, status: 'ready' }],
        }));
    }

    function handleRemove(id: string) {
        update((prev) => ({ knowledge: prev.knowledge.filter((entry) => entry.id !== id) }));
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

                <KnowledgeList items={state.knowledge} onRemove={handleRemove} />

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
                            onChange={(event) => setUrlInput(event.target.value)}
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
                        <p className="mt-1 text-xs text-zinc-400">Agent si stránku přečte a zahrne do znalostní báze.</p>
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
