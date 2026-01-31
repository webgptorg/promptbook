/**
 * Configuration for an async alert dialog.
 */
export type AlertDialogOptions = {
    /**
     * Optional dialog title.
     */
    readonly title?: string;
    /**
     * Message displayed in the dialog body.
     */
    readonly message: string;
    /**
     * Optional label for the primary action button.
     */
    readonly confirmLabel?: string;
};

/**
 * Configuration for an async confirm dialog.
 */
export type ConfirmDialogOptions = {
    /**
     * Optional dialog title.
     */
    readonly title?: string;
    /**
     * Message displayed in the dialog body.
     */
    readonly message: string;
    /**
     * Optional label for the confirm action.
     */
    readonly confirmLabel?: string;
    /**
     * Optional label for the cancel action.
     */
    readonly cancelLabel?: string;
};

/**
 * Configuration for an async prompt dialog.
 */
export type PromptDialogOptions = {
    /**
     * Optional dialog title.
     */
    readonly title?: string;
    /**
     * Optional helper text displayed above the input.
     */
    readonly message?: string;
    /**
     * Optional label for the confirm action.
     */
    readonly confirmLabel?: string;
    /**
     * Optional label for the cancel action.
     */
    readonly cancelLabel?: string;
    /**
     * Initial input value.
     */
    readonly defaultValue?: string;
    /**
     * Placeholder text for the input.
     */
    readonly placeholder?: string;
    /**
     * Accessible label for the input.
     */
    readonly inputLabel?: string;
};

/**
 * Internal modal request types used by the async dialogs system.
 */
export type ModalRequest =
    | ({ readonly kind: 'alert' } & AlertDialogOptions)
    | ({ readonly kind: 'confirm' } & ConfirmDialogOptions)
    | ({ readonly kind: 'prompt' } & PromptDialogOptions);

/**
 * Result map for each dialog kind.
 */
export type ModalResultMap = {
    alert: void;
    confirm: boolean;
    prompt: string;
};

/**
 * Modal request narrowed by dialog kind.
 */
export type ModalRequestByKind<T extends ModalRequest['kind']> = Extract<ModalRequest, { kind: T }>;

/**
 * Controller interface implemented by the async dialogs provider.
 */
export type ModalController = {
    /**
     * Enqueue a modal request and resolve when it completes.
     *
     * @param request - Modal request to enqueue.
     * @returns Promise resolved with the modal result.
     */
    readonly enqueue: <T extends ModalRequest['kind']>(request: ModalRequestByKind<T>) => Promise<ModalResultMap[T]>;
};

/**
 * Error thrown when a dialog is dismissed without completing.
 */
export class ModalDismissedError extends Error {
    /**
     * Dialog kind that was dismissed.
     */
    public readonly kind: ModalRequest['kind'];

    /**
     * Creates a new dismissal error.
     *
     * @param kind - Dialog kind that was dismissed.
     */
    public constructor(kind: ModalRequest['kind']) {
        super('Async dialog dismissed.');
        this.name = 'ModalDismissedError';
        this.kind = kind;
    }
}

let modalController: ModalController | null = null;

/**
 * Register the active modal controller from the provider.
 *
 * @param controller - Controller to register, or null to clear it.
 */
export function registerModalController(controller: ModalController | null): void {
    modalController = controller;
}

/**
 * Resolve the active modal controller.
 *
 * @returns Active modal controller.
 */
function getModalController(): ModalController {
    if (!modalController) {
        throw new Error('AsyncDialogsProvider is not mounted.');
    }

    return modalController;
}

/**
 * Show an async alert dialog.
 *
 * @param options - Alert dialog options.
 * @returns Promise that resolves when the dialog is acknowledged.
 */
export function showAlert(options: AlertDialogOptions): Promise<void> {
    return getModalController().enqueue({ kind: 'alert', ...options });
}

/**
 * Show an async confirm dialog.
 *
 * @param options - Confirm dialog options.
 * @returns Promise that resolves when the user confirms.
 */
export function showConfirm(options: ConfirmDialogOptions): Promise<boolean> {
    return getModalController().enqueue({ kind: 'confirm', ...options });
}

/**
 * Show an async prompt dialog.
 *
 * @param options - Prompt dialog options.
 * @returns Promise that resolves with the input value.
 */
export function showPrompt(options: PromptDialogOptions): Promise<string> {
    return getModalController().enqueue({ kind: 'prompt', ...options });
}
