'use client';

import { TODO_any } from '@promptbook-local/types';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LoginDialog } from '../LoginDialog/LoginDialog';
import { Dialog } from '../Portal/Dialog';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import {
    ModalDismissedError,
    registerModalController,
    type ModalController,
    type ModalRequest,
    type ModalRequestByKind,
    type ModalResultMap,
} from './asyncDialogs';

/**
 * Union of possible dialog results.
 */
type ModalResult = ModalResultMap[ModalRequest['kind']];

/**
 * Queue item used by the async dialogs provider.
 */
type ModalQueueItem = {
    /**
     * Unique identifier for the queued request.
     */
    readonly id: string;
    /**
     * Modal request to render.
     */
    readonly request: ModalRequest;
    /**
     * Resolves the modal with a result.
     */
    readonly resolve: (value: ModalResult) => void;
    /**
     * Rejects the modal promise.
     */
    readonly reject: (error: Error) => void;
};

/**
 * Props for the async dialogs provider.
 */
type AsyncDialogsProviderProps = {
    /**
     * Child content that can trigger dialogs.
     */
    readonly children: ReactNode;
};

const AsyncDialogsContext = createContext<ModalController | null>(null);

/**
 * Access the async dialog controller from React components.
 *
 * @returns Async dialog controller.
 */
export function useAsyncDialogs(): ModalController {
    const context = useContext(AsyncDialogsContext);
    if (!context) {
        throw new Error('AsyncDialogsProvider is not mounted.');
    }
    return context;
}

/**
 * Props for the shared dialog shell.
 */
type DialogShellProps = {
    /**
     * Dialog title.
     */
    readonly title: string;
    /**
     * Optional dialog description.
     */
    readonly description?: string;
    /**
     * Close handler invoked for dismissals.
     */
    readonly onClose: () => void;
    /**
     * Dialog body content.
     */
    readonly children?: ReactNode;
    /**
     * Footer action content.
     */
    readonly footer: ReactNode;
    /**
     * Optional submit handler for form dialogs.
     */
    readonly onSubmit?: () => void;
};

/**
 * Shared dialog shell used by alert, confirm, and prompt dialogs.
 */
function DialogShell(props: DialogShellProps) {
    const { title, description, onClose, children, footer, onSubmit } = props;
    const Wrapper = onSubmit ? 'form' : 'div';
    const { t } = useServerLanguage();

    return (
        <Dialog onClose={onClose} className="w-full max-w-md p-6">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors"
                type="button"
            >
                <X className="w-5 h-5" />
                <span className="sr-only">{t('common.close')}</span>
            </button>

            <Wrapper
                className="space-y-6"
                onSubmit={
                    onSubmit
                        ? (event) => {
                              event.preventDefault();
                              onSubmit();
                          }
                        : undefined
                }
            >
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    {description ? <p className="text-sm text-gray-600">{description}</p> : null}
                </div>
                {children}
                <div className="flex flex-wrap justify-end gap-3">{footer}</div>
            </Wrapper>
        </Dialog>
    );
}

/**
 * Props for the alert dialog component.
 */
type AlertDialogProps = {
    /**
     * Optional dialog title.
     */
    readonly title?: string;
    /**
     * Body message shown in the dialog.
     */
    readonly message: string;
    /**
     * Optional confirm label.
     */
    readonly confirmLabel?: string;
    /**
     * Confirm handler invoked when the alert is acknowledged.
     */
    readonly onConfirm: () => void;
    /**
     * Cancel handler invoked when the alert is dismissed.
     */
    readonly onCancel: () => void;
};

/**
 * Alert dialog component for async alerts.
 */
function AlertDialog(props: AlertDialogProps) {
    const { title, message, confirmLabel, onConfirm, onCancel } = props;
    const { t } = useServerLanguage();

    return (
        <DialogShell
            title={title || t('asyncDialog.defaultAlertTitle')}
            description={message}
            onClose={onCancel}
            footer={
                <button
                    type="button"
                    onClick={onConfirm}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                    {confirmLabel || t('common.ok')}
                </button>
            }
        />
    );
}

/**
 * Props for the confirm dialog component.
 */
type ConfirmDialogProps = {
    /**
     * Optional dialog title.
     */
    readonly title?: string;
    /**
     * Body message shown in the dialog.
     */
    readonly message: string;
    /**
     * Optional confirm label.
     */
    readonly confirmLabel?: string;
    /**
     * Optional cancel label.
     */
    readonly cancelLabel?: string;
    /**
     * Confirm handler invoked when the user confirms.
     */
    readonly onConfirm: () => void;
    /**
     * Cancel handler invoked when the dialog is dismissed.
     */
    readonly onCancel: () => void;
};

/**
 * Confirm dialog component for async confirmations.
 */
function ConfirmDialog(props: ConfirmDialogProps) {
    const { title, message, confirmLabel, cancelLabel, onConfirm, onCancel } = props;
    const { t } = useServerLanguage();

    return (
        <DialogShell
            title={title || t('asyncDialog.defaultConfirmTitle')}
            description={message}
            onClose={onCancel}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
                    >
                        {cancelLabel || t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        {confirmLabel || t('common.confirm')}
                    </button>
                </>
            }
        />
    );
}

/**
 * Props for the prompt dialog component.
 */
type PromptDialogProps = {
    /**
     * Optional dialog title.
     */
    readonly title?: string;
    /**
     * Optional helper message.
     */
    readonly message?: string;
    /**
     * Optional confirm label.
     */
    readonly confirmLabel?: string;
    /**
     * Optional cancel label.
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
    /**
     * Confirm handler invoked with the input value.
     */
    readonly onConfirm: (value: string) => void;
    /**
     * Cancel handler invoked when the dialog is dismissed.
     */
    readonly onCancel: () => void;
};

/**
 * Prompt dialog component for async prompts.
 */
function PromptDialog(props: PromptDialogProps) {
    const { title, message, confirmLabel, cancelLabel, defaultValue, placeholder, inputLabel, onConfirm, onCancel } =
        props;
    const { t } = useServerLanguage();
    const [value, setValue] = useState(defaultValue ?? '');
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <DialogShell
            title={title || t('asyncDialog.defaultPromptTitle')}
            description={message}
            onClose={onCancel}
            onSubmit={() => onConfirm(value)}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
                    >
                        {cancelLabel || t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        {confirmLabel || t('common.confirm')}
                    </button>
                </>
            }
        >
            <div className="space-y-2">
                <label htmlFor={inputId} className="sr-only">
                    {inputLabel || t('common.input')}
                </label>
                <input
                    id={inputId}
                    ref={inputRef}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
            </div>
        </DialogShell>
    );
}

/**
 * Props for the async dialog renderer.
 */
type AsyncDialogRendererProps = {
    /**
     * Request to render.
     */
    readonly request: ModalRequest;
    /**
     * Resolve handler for completed dialogs.
     */
    readonly onResolve: (value: ModalResult) => void;
    /**
     * Reject handler for dismissed dialogs.
     */
    readonly onReject: (error: Error) => void;
};

/**
 * Renders the active dialog based on the current request.
 */
function AsyncDialogRenderer(props: AsyncDialogRendererProps) {
    const { request, onResolve, onReject } = props;

    if (request.kind === 'alert') {
        return (
            <AlertDialog
                title={request.title}
                message={request.message}
                confirmLabel={request.confirmLabel}
                onConfirm={() => onResolve(undefined)}
                onCancel={() => onReject(new ModalDismissedError('alert'))}
            />
        );
    }

    if (request.kind === 'confirm') {
        return (
            <ConfirmDialog
                title={request.title}
                message={request.message}
                confirmLabel={request.confirmLabel}
                cancelLabel={request.cancelLabel}
                onConfirm={() => onResolve(true)}
                onCancel={() => onReject(new ModalDismissedError('confirm'))}
            />
        );
    }

    if (request.kind === 'prompt') {
        return (
            <PromptDialog
                title={request.title}
                message={request.message}
                confirmLabel={request.confirmLabel}
                cancelLabel={request.cancelLabel}
                defaultValue={request.defaultValue}
                placeholder={request.placeholder}
                inputLabel={request.inputLabel}
                onConfirm={(value) => onResolve(value)}
                onCancel={() => onReject(new ModalDismissedError('prompt'))}
            />
        );
    }

    if (request.kind === 'login') {
        const { title, description, refreshAfterSuccess, onSuccess } = request;
        const handleLoginSuccess = async () => {
            try {
                if (onSuccess) {
                    await onSuccess();
                }
                onResolve(undefined);
            } catch (error) {
                onReject(error instanceof Error ? error : new Error('Login success handler failed'));
            }
        };

        return (
            <LoginDialog
                title={title}
                description={description}
                refreshAfterSuccess={refreshAfterSuccess}
                onSuccess={handleLoginSuccess}
                onCancel={() => onReject(new ModalDismissedError('login'))}
            />
        );
    }

    throw new Error(`Unsupported modal kind: ${(request as TODO_any).kind}`);
}

/**
 * Provider that queues async dialogs and renders them in order.
 */
export function AsyncDialogsProvider({ children }: AsyncDialogsProviderProps) {
    const [queue, setQueue] = useState<ModalQueueItem[]>([]);
    const queueRef = useRef<ModalQueueItem[]>([]);
    const activeItem = queue[0] ?? null;
    const activeItemRef = useRef<ModalQueueItem | null>(null);
    const completedIdsRef = useRef<Set<string>>(new Set());
    const idCounterRef = useRef(0);

    useEffect(() => {
        queueRef.current = queue;
        activeItemRef.current = activeItem;
    }, [queue, activeItem]);

    const enqueue = useCallback(
        <T extends ModalRequest['kind']>(request: ModalRequestByKind<T>) =>
            new Promise<ModalResultMap[T]>((resolve, reject) => {
                const nextId = idCounterRef.current;
                idCounterRef.current += 1;
                const queueItem: ModalQueueItem = {
                    id: `async-dialog-${nextId}`,
                    request,
                    resolve: resolve as (value: ModalResult) => void,
                    reject,
                };
                setQueue((prev) => [...prev, queueItem]);
            }),
        [],
    );

    const controller = useMemo<ModalController>(() => ({ enqueue }), [enqueue]);

    const completeActive = useCallback((finalize: (item: ModalQueueItem) => void) => {
        const item = activeItemRef.current;
        if (!item || completedIdsRef.current.has(item.id)) {
            return;
        }
        completedIdsRef.current.add(item.id);
        finalize(item);
        setQueue((prev) => prev.slice(1));
    }, []);

    const handleResolve = useCallback(
        (value: ModalResult) => {
            completeActive((item) => item.resolve(value));
        },
        [completeActive],
    );

    const handleReject = useCallback(
        (error: Error) => {
            completeActive((item) => item.reject(error));
        },
        [completeActive],
    );

    useEffect(() => {
        registerModalController(controller);
        return () => {
            registerModalController(null);
            queueRef.current.forEach((item) => item.reject(new ModalDismissedError(item.request.kind)));
        };
    }, [controller]);

    return (
        <AsyncDialogsContext.Provider value={controller}>
            {children}
            {activeItem ? (
                <AsyncDialogRenderer
                    key={activeItem.id}
                    request={activeItem.request}
                    onResolve={handleResolve}
                    onReject={handleReject}
                />
            ) : null}
        </AsyncDialogsContext.Provider>
    );
}
