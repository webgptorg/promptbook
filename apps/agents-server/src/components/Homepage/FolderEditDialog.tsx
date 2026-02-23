'use client';

import { CheckIcon, MoreHorizontalIcon, PaletteIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { resolveFolderColor } from '../../utils/agentOrganization/folderAppearance';
import { Dialog } from '../Portal/Dialog';
import {
    FOLDER_ICON_OPTIONS,
    FOLDER_ICON_PRIMARY_OPTIONS,
    FolderAppearanceIcon,
    resolveFolderIconOption,
} from '../FolderAppearance/FolderAppearanceIcon';

/**
 * Editable folder fields shared by create and edit flows.
 */
export type FolderEditValues = {
    /**
     * Folder display name.
     */
    readonly name: string;
    /**
     * Persisted folder icon identifier.
     */
    readonly icon: string | null;
    /**
     * Persisted folder color in #rrggbb format.
     */
    readonly color: string | null;
};

/**
 * Mode used by the folder editor dialog.
 */
export type FolderEditMode = 'CREATE' | 'EDIT';

/**
 * Props for the folder editor dialog.
 */
type FolderEditDialogProps = {
    /**
     * Controls whether the dialog is rendered.
     */
    readonly isOpen: boolean;
    /**
     * Dialog mode used for labels and submit action text.
     */
    readonly mode: FolderEditMode;
    /**
     * Initial values shown when the dialog opens.
     */
    readonly initialValues: FolderEditValues;
    /**
     * True while submit request is running.
     */
    readonly isSubmitting: boolean;
    /**
     * Called when the dialog should close without saving.
     */
    readonly onClose: () => void;
    /**
     * Called when user submits folder values.
     */
    readonly onSubmit: (values: FolderEditValues) => void | Promise<void>;
};

/**
 * Folder create/edit dialog with fields for name, icon, and color.
 */
export function FolderEditDialog(props: FolderEditDialogProps) {
    const { isOpen, mode, initialValues, isSubmitting, onClose, onSubmit } = props;
    const [name, setName] = useState(initialValues.name);
    const [icon, setIcon] = useState<string | null>(initialValues.icon);
    const [color, setColor] = useState<string>(resolveFolderColor(initialValues.color));
    const [isIconPickerExpanded, setIsIconPickerExpanded] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsIconPickerExpanded(false);
            return;
        }
        setName(initialValues.name);
        setIcon(initialValues.icon);
        setColor(resolveFolderColor(initialValues.color));
        const resolvedInitialIcon = resolveFolderIconOption(initialValues.icon);
        const isPrimaryIcon = FOLDER_ICON_PRIMARY_OPTIONS.some((option) => option.id === resolvedInitialIcon.id);
        setIsIconPickerExpanded(!isPrimaryIcon);
    }, [initialValues.color, initialValues.icon, initialValues.name, isOpen]);

    const submitLabel = mode === 'CREATE' ? 'Create folder' : 'Save changes';
    const title = mode === 'CREATE' ? 'Create folder' : 'Edit folder';
    const selectedIcon = useMemo(() => resolveFolderIconOption(icon), [icon]);
    const iconOptions = isIconPickerExpanded ? FOLDER_ICON_OPTIONS : FOLDER_ICON_PRIMARY_OPTIONS;
    const showMoreIconButton = !isIconPickerExpanded && FOLDER_ICON_OPTIONS.length > FOLDER_ICON_PRIMARY_OPTIONS.length;
    const iconGridClassName = `grid grid-cols-4 gap-2 ${isIconPickerExpanded ? 'max-h-64 overflow-y-auto pr-1' : ''}`;

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog onClose={isSubmitting ? () => undefined : onClose} className="w-full max-w-lg p-6">
            <form
                className="space-y-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    void onSubmit({
                        name,
                        icon,
                        color,
                    });
                }}
            >
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-600">Configure folder name, icon, and color.</p>
                </div>

                <div className="space-y-2">
                    <label htmlFor="folder-edit-name" className="text-sm font-medium text-gray-700">
                        Folder name
                    </label>
                    <input
                        id="folder-edit-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        disabled={isSubmitting}
                        placeholder="Folder name"
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-gray-700">Folder icon</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FolderAppearanceIcon
                                icon={selectedIcon.id}
                                color={color}
                                containerClassName="flex h-8 w-8 items-center justify-center rounded-md border"
                                iconClassName="w-4 h-4"
                            />
                            <span>{selectedIcon.label}</span>
                        </div>
                    </div>
                    <div className={iconGridClassName}>
                        {iconOptions.map((option) => {
                            const isSelected = option.id === selectedIcon.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setIcon(option.id)}
                                    disabled={isSubmitting}
                                    title={option.label}
                                    className={`relative flex items-center justify-center rounded-md border p-2 transition-colors ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                    <option.Icon className="h-4 w-4" aria-hidden />
                                    {isSelected && (
                                        <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 p-0.5 text-white">
                                            <CheckIcon className="h-3 w-3" aria-hidden />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {showMoreIconButton && (
                            <button
                                type="button"
                                onClick={() => setIsIconPickerExpanded(true)}
                                disabled={isSubmitting}
                                title="More icons"
                                className="flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <MoreHorizontalIcon className="h-4 w-4" aria-hidden />
                                <span className="sr-only">More icons</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="folder-edit-color" className="text-sm font-medium text-gray-700">
                        Folder color
                    </label>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                id="folder-edit-color"
                                type="color"
                                value={color}
                                disabled={isSubmitting}
                                onChange={(event) => setColor(event.target.value.toLowerCase())}
                                className="h-10 w-12 cursor-pointer rounded-md border border-gray-200 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <PaletteIcon className="pointer-events-none absolute -right-2 -top-2 h-3 w-3 rounded-full bg-white text-gray-500" />
                        </div>
                        <input
                            value={color}
                            disabled
                            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                            aria-label="Selected color"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? 'Saving...' : submitLabel}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
