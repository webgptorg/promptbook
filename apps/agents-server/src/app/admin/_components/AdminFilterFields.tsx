import type { ReactNode } from 'react';

/**
 * One option of a shared admin filter select.
 *
 * @private shared admin UI type
 */
export type AdminFilterSelectOption = {
    readonly label: string;
    readonly value: string;
};

/**
 * Props for the shared admin filter field wrapper.
 *
 * @private shared admin UI type
 */
type AdminFilterFieldProps = {
    readonly children: ReactNode;
    readonly htmlFor: string;
    readonly label: string;
};

/**
 * Props for the shared admin filter select.
 *
 * @private shared admin UI type
 */
type AdminFilterSelectFieldProps = {
    readonly disabled?: boolean;
    readonly id: string;
    readonly label: string;
    readonly onChange: (value: string) => void;
    readonly options: ReadonlyArray<AdminFilterSelectOption>;
    readonly value: string;
};

/**
 * Shared label-and-control wrapper for compact admin filter controls.
 *
 * @private shared admin UI component
 */
export function AdminFilterField({ children, htmlFor, label }: AdminFilterFieldProps) {
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
                {label}
            </label>
            {children}
        </div>
    );
}

/**
 * Shared select control used in admin filter panels.
 *
 * @private shared admin UI component
 */
export function AdminFilterSelectField({
    disabled,
    id,
    label,
    onChange,
    options,
    value,
}: AdminFilterSelectFieldProps) {
    return (
        <AdminFilterField label={label} htmlFor={id}>
            <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </AdminFilterField>
    );
}
