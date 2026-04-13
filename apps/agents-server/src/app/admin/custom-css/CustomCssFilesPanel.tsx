import type { CustomStylesheetFileState } from './CustomStylesheetFileState';

/**
 * Props consumed by `CustomCssFilesPanel`.
 *
 * @private function of CustomCssClient
 */
type CustomCssFilesPanelProps = {
    readonly files: ReadonlyArray<CustomStylesheetFileState>;
    readonly selectedFileLocalId: string;
    readonly onAddNewFile: () => void;
    readonly onSelectFile: (localId: string) => void;
};

/**
 * Renders the stylesheet list and selection controls.
 *
 * @private function of CustomCssClient
 */
export function CustomCssFilesPanel({
    files,
    selectedFileLocalId,
    onAddNewFile,
    onSelectFile,
}: CustomCssFilesPanelProps) {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Stylesheets</h2>
                <button
                    type="button"
                    onClick={onAddNewFile}
                    className="rounded-md bg-green-600 px-2 py-0.5 text-xs font-semibold text-white transition hover:bg-green-700"
                >
                    New
                </button>
            </div>
            <p className="text-xs text-gray-500">Each file is merged into the global stylesheet.</p>

            <div className="mt-4 space-y-2">
                {files.length === 0 && (
                    <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-center text-xs text-gray-500">
                        Add your first stylesheet to get started.
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
                                    : 'border-transparent bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="text-sm font-medium text-gray-900">{file.scope || 'Untitled stylesheet'}</div>
                            <div className="text-xs text-gray-500">
                                {file.updatedAt ? `Saved ${new Date(file.updatedAt).toLocaleString()}` : 'Not saved yet'}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
