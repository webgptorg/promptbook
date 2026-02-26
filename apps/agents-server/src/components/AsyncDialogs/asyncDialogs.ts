import type { AgentVisibility } from '../../utils/agentVisibility';

/**
 * Configuration for an async alert dialog.
 * @private @@@
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
 * @private @@@
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
 * @private @@@
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
 * Configuration for an async login dialog.
 * @private @@@
 */
export type LoginDialogOptions = {
    /**
     * Optional dialog title.
     */
    readonly title?: string;
    /**
     * Optional description shown below the title.
     */
    readonly description?: string;
    /**
     * When true, refreshes the current route after a successful login.
     *
     * @default true
     */
    readonly refreshAfterSuccess?: boolean;
    /**
     * Optional callback invoked after a successful login.
     */
    readonly onSuccess?: () => void | Promise<void>;
};

/**
 * Configuration for an async visibility dialog.
 * @private @@@
 */
export type VisibilityDialogOptions = {
    /**
     * Optional dialog title.
     */
    readonly title?: string;
    /**
     * Optional description shown below the title.
     */
    readonly description?: string;
    /**
     * Optional confirm label.
     */
    readonly confirmLabel?: string;
    /**
     * Optional cancel label.
     */
    readonly cancelLabel?: string;
    /**
     * Initial visibility selection inside the dialog.
     */
    readonly initialVisibility?: AgentVisibility;
};

/**
 * Internal modal request types used by the async dialogs system.
 * @private @@@
 */
export type ModalRequest =
    | ({ readonly kind: 'alert' } & AlertDialogOptions)
    | ({ readonly kind: 'confirm' } & ConfirmDialogOptions)
    | ({ readonly kind: 'prompt' } & PromptDialogOptions)
    | ({ readonly kind: 'login' } & LoginDialogOptions)
    | ({ readonly kind: 'visibility' } & VisibilityDialogOptions);

/**
 * Result map for each dialog kind.
 * @private @@@
 */
export type ModalResultMap = {
    alert: void;
    confirm: boolean;
    prompt: string;
    login: void;
    visibility: AgentVisibility;
};

/**
 * Modal request narrowed by dialog kind.
 * @private @@@
 */
export type ModalRequestByKind<T extends ModalRequest['kind']> = Extract<ModalRequest, { kind: T }>;

/**
 * Controller interface implemented by the async dialogs provider.
 * @private @@@
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
 * @private @@@
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
 * @private @@@
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
 * @private @@@
 */
export function showAlert(options: AlertDialogOptions): Promise<void> {
    return getModalController().enqueue({ kind: 'alert', ...options });
}

/**
 * Show an async confirm dialog.
 *
 * @param options - Confirm dialog options.
 * @returns Promise that resolves when the user confirms.
 * @private @@@
 */
export function showConfirm(options: ConfirmDialogOptions): Promise<boolean> {
    return getModalController().enqueue({ kind: 'confirm', ...options });
}

/**
 * Show an async prompt dialog.
 *
 * @param options - Prompt dialog options.
 * @returns Promise that resolves with the input value.
 * @private @@@
 */
export function showPrompt(options: PromptDialogOptions): Promise<string> {
    return getModalController().enqueue({ kind: 'prompt', ...options });
}

/**
 * Show an async login dialog.
 *
 * @param options - Login dialog options.
 * @returns Promise that resolves when the user successfully logs in.
 * @private @@@
 */
export function showLoginDialog(options: LoginDialogOptions = {}): Promise<void> {
    return getModalController().enqueue({ kind: 'login', ...options });
}

/**
 * Show an async visibility selection dialog.
 *
 * @param options - Visibility dialog options.
 * @returns Promise that resolves with the selected visibility.
 * @private @@@
 */
export function showVisibilityDialog(options: VisibilityDialogOptions): Promise<AgentVisibility> {
    return getModalController().enqueue({ kind: 'visibility', ...options });
}
