import { BookEditorMonacoFormatting } from './BookEditorMonacoFormatting';
import type { UploadItem, UploadStats } from './useBookEditorMonacoUploads';
import styles from './BookEditor.module.css';

const UPLOAD_STATUS_LABELS: Record<UploadItem['status'], string> = {
    queued: 'Queued',
    uploading: 'Uploading',
    paused: 'Paused',
    completed: 'Completed',
    failed: 'Failed',
};

type BookEditorMonacoUploadPanelProps = {
    readonly activeUploadItems: UploadItem[];
    readonly uploadStats: UploadStats;
    readonly pauseUpload: (uploadId: string) => void;
    readonly resumeUpload: (uploadId: string) => void;
};

/**
 * Shows upload progress details for active uploads inside `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export function BookEditorMonacoUploadPanel({
    activeUploadItems,
    uploadStats,
    pauseUpload,
    resumeUpload,
}: BookEditorMonacoUploadPanelProps) {
    if (activeUploadItems.length === 0) {
        return null;
    }

    return (
        <div className={styles.uploadPanel} role="status" aria-live="polite">
            <div className={styles.uploadPanelHeader}>
                <div className={styles.uploadPanelTitle}>Uploads</div>
                <div className={styles.uploadPanelHeaderMeta}>
                    {uploadStats.uploadingFiles + uploadStats.queuedFiles} active / {uploadStats.totalFiles} total
                </div>
            </div>
            <div className={styles.uploadPanelSummary}>
                <div>
                    Files: {uploadStats.totalFiles} total, {uploadStats.completedFiles} done
                </div>
                <div>
                    Data: {BookEditorMonacoFormatting.formatBytes(uploadStats.uploadedBytes)} /{' '}
                    {BookEditorMonacoFormatting.formatBytes(uploadStats.totalBytes)}
                </div>
                <div>
                    Speed:{' '}
                    {uploadStats.speedBytesPerSecond > 0
                        ? `${BookEditorMonacoFormatting.formatBytes(uploadStats.speedBytesPerSecond)}/s`
                        : '--'}
                </div>
                <div>Elapsed: {BookEditorMonacoFormatting.formatDuration(uploadStats.elapsedMs)}</div>
                <div>
                    Paused: {uploadStats.pausedFiles}, Failed: {uploadStats.failedFiles}
                </div>
            </div>
            <div className={styles.uploadPanelProgressBar}>
                <div
                    className={styles.uploadPanelProgressFill}
                    style={{ width: `${Math.round(uploadStats.progress * 100)}%` }}
                />
            </div>
            <div className={styles.uploadPanelList}>
                {activeUploadItems.map((item) => {
                    const percent = Math.round(item.progress * 100);
                    const actionLabel =
                        item.status === 'paused' ? 'Resume' : item.status === 'failed' ? 'Retry' : 'Pause';
                    const canPause = item.status === 'uploading' || item.status === 'queued';
                    const canResume = item.status === 'paused' || item.status === 'failed';

                    return (
                        <div key={item.id} className={styles.uploadRow}>
                            <div className={styles.uploadRowHeader}>
                                <div className={styles.uploadRowName} title={item.fileName}>
                                    {item.fileName}
                                </div>
                                <div className={styles.uploadRowStatus}>{UPLOAD_STATUS_LABELS[item.status]}</div>
                            </div>
                            <div className={styles.uploadRowMeta}>
                                <span>
                                    {BookEditorMonacoFormatting.formatBytes(item.loadedBytes)} /{' '}
                                    {BookEditorMonacoFormatting.formatBytes(item.totalBytes)}
                                </span>
                                <span>{percent}%</span>
                            </div>
                            <div className={styles.uploadRowProgressBar}>
                                <div
                                    className={styles.uploadRowProgressFill}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <div className={styles.uploadRowActions}>
                                {canPause && (
                                    <button
                                        type="button"
                                        className={styles.uploadActionButton}
                                        onClick={() => pauseUpload(item.id)}
                                    >
                                        Pause
                                    </button>
                                )}
                                {canResume && (
                                    <button
                                        type="button"
                                        className={styles.uploadActionButton}
                                        onClick={() => resumeUpload(item.id)}
                                    >
                                        {actionLabel}
                                    </button>
                                )}
                            </div>
                            {item.errorMessage && item.status === 'failed' && (
                                <div className={styles.uploadRowError}>{item.errorMessage}</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
