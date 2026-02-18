/**
 * Formatting helpers for `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export const BookEditorMonacoFormatting = {
    getUploadPlaceholderText: (fileName: string) => `KNOWLEDGE ⏳ Uploading ${fileName}...`,
    formatBytes: (bytes: number) => {
        if (!Number.isFinite(bytes) || bytes <= 0) {
            return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
        const value = bytes / Math.pow(1024, exponent);
        const precision = value >= 10 || exponent === 0 ? 0 : 1;

        return `${value.toFixed(precision)} ${units[exponent]}`;
    },
    formatDuration: (durationMs: number) => {
        if (!Number.isFinite(durationMs) || durationMs <= 0) {
            return '0:00';
        }

        const totalSeconds = Math.floor(durationMs / 1000);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const hours = Math.floor(totalSeconds / 3600);
        const paddedSeconds = `${seconds}`.padStart(2, '0');

        if (hours > 0) {
            const paddedMinutes = `${minutes}`.padStart(2, '0');
            return `${hours}:${paddedMinutes}:${paddedSeconds}`;
        }

        return `${minutes}:${paddedSeconds}`;
    },
};
