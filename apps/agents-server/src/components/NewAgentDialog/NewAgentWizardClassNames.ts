/**
 * Shared Tailwind utility groups used across the extracted wizard modules.
 *
 * @private internal styling of <NewAgentWizard/>.
 */
export const NewAgentWizardClassNames = {
    surfaceCard: 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/90',
    mutedSurfaceCard: 'rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/80',
    dashedSurfaceCard:
        'rounded-xl border border-dashed border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-950/90',
    fieldLabel: 'mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100',
    sectionTitle: 'text-base font-semibold text-slate-900 dark:text-slate-100',
    sectionHint: 'text-sm text-slate-500 dark:text-slate-400',
    input:
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30',
    textarea:
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 min-h-24 resize-y dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30',
    secondaryButton:
        'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900',
    primaryButton:
        'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50',
    selectionPill:
        'rounded-full border px-3 py-1.5 text-sm transition border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900',
    selectionPillActive:
        'rounded-full border px-3 py-1.5 text-sm transition border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100',
    wizardHeaderAction:
        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-200 dark:hover:bg-blue-500/10 dark:hover:text-blue-100',
    wizardCloseButton:
        'rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200',
    wizardStepButtonInactive:
        'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900',
    wizardOverlayBackdrop:
        'pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-blue-50/80 dark:bg-slate-950/78',
    wizardOverlayCard:
        'rounded-xl border border-blue-300 bg-white px-5 py-4 text-center dark:border-blue-500/40 dark:bg-slate-950',
    wizardOverlayTitle: 'text-sm font-semibold text-blue-900 dark:text-blue-100',
    wizardOverlayDescription: 'mt-1 text-sm text-blue-700 dark:text-blue-200',
} as const;
