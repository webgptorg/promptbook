import type { CustomJavascriptFileState } from './CustomJavascriptFileState';

/**
 * Props consumed by `CustomJsFilesPanel`.
 *
 * @private function of CustomJsClient
 */
type CustomJsFilesPanelProps = {
    readonly files: ReadonlyArray<CustomJavascriptFileState>;
    readonly selectedFileLocalId: string;
    readonly onAddNewFile: () => void;
    readonly onSelectFile: (localId: string) => void;
};

/**
 * Renders the custom JavaScript file list and selection controls.
 *
 * @private function of CustomJsClient
 */
export function CustomJsFilesPanel({
    files,
    selectedFileLocalId,
    onAddNewFile,
    onSelectFile,
}: CustomJsFilesPanelProps) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Scripts</h2>
                <button
                    type="button"
                    onClick={onAddNewFile}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-green-700"
                >
                    New file
                </button>
            </div>
            <p className="text-xs text-gray-500">Each file is injected in order and merged into the same global script.</p>

            <div className="mt-4 space-y-2">
                {files.length === 0 && (
                    <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-center text-xs text-gray-500">
                        Add your first script to get started.
                    </div>
                )}
                {files.map((file) => {
                    const isSelected = file.localId === selectedFileLocalId;

                    return (
                        <button
                            key={file.localId}
                            type="button"
                            onClick={() => onSelectFile(file.localId)}
                            className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                                    : 'border-transparent bg-gray-50 hover:border-gray-300'
                            }`}
                        >
                            <div className="text-sm font-medium text-gray-900">{file.scope || 'Untitled script'}</div>
                            <div className="text-xs text-gray-500">
                                {file.updatedAt ? `Saved ${new Date(file.updatedAt).toLocaleString()}` : 'Not saved yet'}
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
