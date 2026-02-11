'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import Editor, { useMonaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// [🚱]> import { MonacoBinding } from 'y-monaco';
// [🚱]> import { WebsocketProvider } from 'y-websocket';
// [🚱]> import * as Y from 'yjs';
// [🚱]> import { TODO_any } from '../../_packages/types.index';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../commitments/_common/getAllCommitmentDefinitions';
import { DEFAULT_MAX_CONCURRENT_UPLOADS, PROMPTBOOK_SYNTAX_COLORS } from '../../config';
import { classNames } from '../_common/react-utils/classNames';
import { SaveIcon } from '../icons/SaveIcon';
import type { BookEditorProps, BookEditorUploadProgressCallback } from './BookEditor';
import styles from './BookEditor.module.css';
import { BookEditorActionbar } from './BookEditorActionbar';

const BOOK_LANGUAGE_ID = 'book';
const LINE_HEIGHT = 28;
const CONTENT_PADDING_LEFT = 20;
const VERTICAL_LINE_LEFT = 0; // <- TODO: This value is weird
const UPLOAD_EDIT_DEBOUNCE_MS = 300;
const UPLOAD_PROGRESS_DEBOUNCE_MS = 150;

/**
 * Matches absolute agent URLs (only `/agents/...` paths).
 */
const AGENT_URL_REFERENCE_REGEX = /https?:\/\/[^\s{}]+\/agents\/[^\s{}]+/i;

/**
 * Matches all clickable agent-reference token variants in Book text.
 */
const AGENT_REFERENCE_TOKEN_REGEX =
    /\{https?:\/\/[^\s{}]+\/agents\/[^\s{}]+\}|\{[A-Za-z0-9_-]{6,}\}|\{[^{}\r\n]*\s+[^{}\r\n]*\}|@[A-Za-z0-9_-]+|https?:\/\/[^\s{}]+\/agents\/[^\s{}]+/g;

/**
 * Captures content of `{...}` agent-reference tokens.
 */
const AGENT_REFERENCE_BRACED_REGEX = /^\{([\s\S]+)\}$/;

/**
 * Regex rules reused by Monaco tokenization for agent-reference highlighting.
 */
const AGENT_REFERENCE_HIGHLIGHT_REGEXES = [
    /\{https?:\/\/[^\s{}]+\/agents\/[^\s{}]+\}/,
    /https?:\/\/[^\s{}]+\/agents\/[^\s{}]+/,
    /\{[A-Za-z0-9_-]{6,}\}/,
    /\{[^{}\r\n]*\s+[^{}\r\n]*\}/,
    /@[A-Za-z0-9_-]+/,
] as const;

let uploadSequenceCounter = 0;

/**
 * States for a tracked BookEditor upload.
 */
type UploadStatus = 'queued' | 'uploading' | 'paused' | 'completed' | 'failed';

/**
 * Upload metadata tracked for the floating panel.
 */
type UploadItem = {
    id: string;
    fileName: string;
    fileSize: number;
    status: UploadStatus;
    progress: number;
    loadedBytes: number;
    totalBytes: number;
    startedAt: number | null;
    completedAt: number | null;
    errorMessage?: string;
};

/**
 * Pending progress updates batched for UI refresh.
 */
type UploadProgressUpdate = {
    progress: number;
    loadedBytes: number;
    totalBytes: number;
};

/**
 * Pending placeholder replacements batched for editor updates.
 */
type UploadReplacement = {
    uploadId: string;
    decorationId: string;
    replacementText: string;
};

/**
 * Aggregated stats for the upload panel.
 */
type UploadStats = {
    totalFiles: number;
    queuedFiles: number;
    uploadingFiles: number;
    pausedFiles: number;
    failedFiles: number;
    completedFiles: number;
    totalBytes: number;
    uploadedBytes: number;
    progress: number;
    elapsedMs: number;
    speedBytesPerSecond: number;
};

/**
 * Parsed clickable agent-reference token in the editor source.
 */
type AgentReferenceMatch = {
    value: string;
    url: string;
    index: number;
    length: number;
};

const UPLOAD_STATUS_LABELS: Record<UploadStatus, string> = {
    queued: 'Queued',
    uploading: 'Uploading',
    paused: 'Paused',
    completed: 'Completed',
    failed: 'Failed',
};

/**
 * Builds the placeholder text for an in-progress upload entry.
 */
const getUploadPlaceholderText = (fileName: string) => `KNOWLEDGE ⏳ Uploading ${fileName}...`;

/**
 * Formats a byte size into a readable string.
 */
const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, exponent);
    const precision = value >= 10 || exponent === 0 ? 0 : 1;

    return `${value.toFixed(precision)} ${units[exponent]}`;
};

/**
 * Formats a duration in milliseconds into a readable timer string.
 */
const formatDuration = (durationMs: number) => {
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
};

/**
 * Generates a unique id for upload tracking.
 */
const createUploadId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }

    uploadSequenceCounter += 1;
    return `upload-${Date.now()}-${uploadSequenceCounter}`;
};

/**
 * Detects whether an error represents an aborted upload.
 */
const isAbortError = (error: unknown) => {
    if (!error) {
        return false;
    }

    if (typeof error === 'object' && 'name' in error) {
        return (error as { name?: string }).name === 'AbortError';
    }

    const message = error instanceof Error ? error.message : String(error);
    return message.toLowerCase().includes('abort');
};

/**
 * Extracts the underlying reference value from a raw token.
 */
const extractAgentReferenceValue = (token: string): string => {
    if (token.startsWith('@')) {
        return token.slice(1).trim();
    }

    const bracedMatch = token.match(AGENT_REFERENCE_BRACED_REGEX);
    if (bracedMatch?.[1] !== undefined) {
        return bracedMatch[1].trim();
    }

    return token.trim();
};

/**
 * Resolves a compact or absolute reference token into a clickable agent URL.
 */
const resolveAgentReferenceToUrl = (referenceValue: string): string | null => {
    const normalizedReferenceValue = referenceValue.replace(/[),.;!?]+$/g, '').trim();

    if (!normalizedReferenceValue) {
        return null;
    }

    if (AGENT_URL_REFERENCE_REGEX.test(normalizedReferenceValue)) {
        return normalizedReferenceValue;
    }

    if (normalizedReferenceValue.startsWith('http://') || normalizedReferenceValue.startsWith('https://')) {
        return null;
    }

    const encoded = encodeURIComponent(normalizedReferenceValue);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/agents/${encoded}`;
};

/**
 * Finds all agent references that should be highlighted and ctrl/cmd-clickable.
 */
const extractAgentReferenceMatches = (content: string): AgentReferenceMatch[] => {
    const matches: AgentReferenceMatch[] = [];
    let match: RegExpExecArray | null;

    AGENT_REFERENCE_TOKEN_REGEX.lastIndex = 0;

    while ((match = AGENT_REFERENCE_TOKEN_REGEX.exec(content)) !== null) {
        const token = match[0];
        const index = match.index;

        if (!token || index === undefined) {
            continue;
        }

        if (token.startsWith('@') && index > 0) {
            const previousChar = content[index - 1] || '';
            if (/[A-Za-z0-9_.-]/.test(previousChar)) {
                continue;
            }
        }

        const value = extractAgentReferenceValue(token);
        const url = resolveAgentReferenceToUrl(value);

        if (!url) {
            continue;
        }

        matches.push({
            value,
            url,
            index,
            length: token.length,
        });
    }

    return matches;
};

/**
 * @private Internal component used by `BookEditor`
 */
let notebookStyleCounter = 0;

/**
 * @private Internal component used by `BookEditor`
 */
export function BookEditorMonaco(props: BookEditorProps) {
    const {
        value,
        onChange,
        isReadonly,
        translations,
        onFileUpload,
        isUploadButtonShown,
        isCameraButtonShown,
        isDownloadButtonShown,
        isAboutButtonShown = true,
        isFullscreenButtonShown = true,
        onFullscreenClick,
        isFullscreen,
        zoom = 1,
        // [🚱]> sync,
    } = props;

    const zoomLevel = zoom;

    const scaledLineHeight = Math.round(LINE_HEIGHT * zoomLevel);
    const scaledContentPaddingLeft = Math.max(8, Math.round(CONTENT_PADDING_LEFT * zoomLevel));
    const scaledVerticalLineLeft = Math.max(0, Math.round(VERTICAL_LINE_LEFT * zoomLevel));
    const baseFontSize = 20;
    const scaledFontSize = Math.max(8, Math.round(baseFontSize * zoomLevel));
    const scaledScrollbarSize = Math.max(2, Math.round(5 * zoomLevel));

    const [isDragOver, setIsDragOver] = useState(false);
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isSavedShown, setIsSavedShown] = useState(false);
    const [uploadItems, setUploadItemsState] = useState<UploadItem[]>([]);

    const monaco = useMonaco();

    // stable unique id for this instance
    const instanceIdRef = useRef(++notebookStyleCounter);
    const instanceClass = `book-editor-instance-${instanceIdRef.current}`;

    // [1] Track touch start position to differentiate tap from drag
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const fileUploadInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const uploadItemsRef = useRef<UploadItem[]>([]);
    const uploadFilesRef = useRef<Map<string, File>>(new Map());
    const uploadDecorationIdsRef = useRef<Map<string, string>>(new Map());
    const uploadControllersRef = useRef<Map<string, AbortController>>(new Map());
    const uploadQueueTimerRef = useRef<number | null>(null);
    const editorUpdateTimerRef = useRef<number | null>(null);
    const progressUpdateTimerRef = useRef<number | null>(null);
    const pendingReplacementsRef = useRef<UploadReplacement[]>([]);
    const pendingProgressUpdatesRef = useRef<Map<string, UploadProgressUpdate>>(new Map());
    const processUploadQueueRef = useRef<() => void>(() => undefined);

    /*
    Note+TODO: [🚱] Yjs logic is commented out because it causes errors in the build of Next.js projects:
             > ▲ Next.js 15.4.5
             > - Experiments (use with caution):
             >     ✓ externalDir
             >
             > Creating an optimized production build ...
             > ✓ Compiled successfully in 17.0s
             > ✓ Linting and checking validity of types    
             > ✓ Collecting page data    
             > Error occurred prerendering page "/". Read more: https://nextjs.org/docs/messages/prerender-error
             > ReferenceError: window is not defined
             >     at 27132 (C:\Users\me\work\ai\promptbook\apps\book-components\.next\server\chunks\134.js:1:525485)
             >     at c (C:\Users\me\work\ai\promptbook\apps\book-components\.next\server\webpack-runtime.js:1:128)
             >     at 89192 (C:\Users\me\work\ai\promptbook\apps\book-components\.next\server\chunks\462.js:711:10466)
             >     at Object.c [as require] (C:\Users\me\work\ai\promptbook\apps\book-components\.next\server\webpack-runtime.js:1:128) {
             > digest: '2500543835'
             > }
             > Export encountered an error on /page: /, exiting the build.
             > ⨯ Next.js build worker exited with code: 1 and signal: null


    const [editor, setEditor] = useState<TODO_any>(null);
      
    useEffect(() => {
        if (!monaco || !editor || !sync) {
            return;
        }

        const ydoc = new Y.Doc();
        const provider = new WebsocketProvider(sync.serverUrl, sync.roomName, ydoc);
        const ytext = ydoc.getText('monaco');

        const binding = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness);

        return () => {
            binding.destroy();
            provider.destroy();
        };
    }, [monaco, editor, sync]);
    */

    useEffect(() => {
        // Note: Test on client side only
        setIsTouchDevice(typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
    }, []);

    /**
     * Updates upload items state and keeps the ref in sync.
     */
    const setUploadItems = useCallback((updater: (items: UploadItem[]) => UploadItem[]) => {
        const next = updater(uploadItemsRef.current);
        uploadItemsRef.current = next;
        setUploadItemsState(next);
    }, []);

    /**
     * Batches upload progress updates to reduce render churn.
     */
    const queueProgressUpdate = useCallback(
        (uploadId: string, progress: number, loadedBytes: number, totalBytes: number) => {
            pendingProgressUpdatesRef.current.set(uploadId, {
                progress,
                loadedBytes,
                totalBytes,
            });

            if (progressUpdateTimerRef.current !== null) {
                return;
            }

            progressUpdateTimerRef.current = window.setTimeout(() => {
                progressUpdateTimerRef.current = null;
                const updates = pendingProgressUpdatesRef.current;
                pendingProgressUpdatesRef.current = new Map();

                setUploadItems((items) =>
                    items.map((item) => {
                        const update = updates.get(item.id);
                        if (!update) {
                            return item;
                        }

                        return {
                            ...item,
                            progress: update.progress,
                            loadedBytes: update.loadedBytes,
                            totalBytes: update.totalBytes,
                        };
                    }),
                );
            }, UPLOAD_PROGRESS_DEBOUNCE_MS);
        },
        [setUploadItems],
    );

    /**
     * Applies queued placeholder replacements in a single editor edit batch.
     */
    const flushEditorReplacements = useCallback(() => {
        if (!editor) {
            return;
        }

        const model = editor.getModel();
        if (!model) {
            return;
        }

        const replacements = pendingReplacementsRef.current;
        pendingReplacementsRef.current = [];

        const edits: editor.IIdentifiedSingleEditOperation[] = [];
        const decorationsToRemove: string[] = [];

        for (const replacement of replacements) {
            const range = model.getDecorationRange(replacement.decorationId);
            if (!range) {
                uploadDecorationIdsRef.current.delete(replacement.uploadId);
                continue;
            }

            edits.push({
                range,
                text: replacement.replacementText,
                forceMoveMarkers: true,
            });
            decorationsToRemove.push(replacement.decorationId);
            uploadDecorationIdsRef.current.delete(replacement.uploadId);
        }

        if (edits.length > 0) {
            editor.executeEdits('upload-replacements', edits);
        }

        if (decorationsToRemove.length > 0) {
            editor.deltaDecorations(decorationsToRemove, []);
        }
    }, [editor]);

    /**
     * Queues a placeholder replacement and debounces editor updates.
     */
    const queueEditorReplacement = useCallback(
        (uploadId: string, replacementText: string) => {
            const decorationId = uploadDecorationIdsRef.current.get(uploadId);
            if (!decorationId) {
                return;
            }

            const pendingIndex = pendingReplacementsRef.current.findIndex((item) => item.uploadId === uploadId);
            const nextReplacement: UploadReplacement = {
                uploadId,
                decorationId,
                replacementText,
            };

            if (pendingIndex >= 0) {
                pendingReplacementsRef.current[pendingIndex] = nextReplacement;
            } else {
                pendingReplacementsRef.current.push(nextReplacement);
            }

            if (editorUpdateTimerRef.current !== null) {
                return;
            }

            editorUpdateTimerRef.current = window.setTimeout(() => {
                editorUpdateTimerRef.current = null;
                flushEditorReplacements();
            }, UPLOAD_EDIT_DEBOUNCE_MS);
        },
        [flushEditorReplacements],
    );

    /**
     * Schedules upload queue processing on the next tick.
     */
    const queueUploadProcessing = useCallback(() => {
        if (uploadQueueTimerRef.current !== null) {
            return;
        }

        uploadQueueTimerRef.current = window.setTimeout(() => {
            uploadQueueTimerRef.current = null;
            processUploadQueueRef.current();
        }, 0);
    }, []);

    /**
     * Starts uploading a queued item.
     */
    const startUpload = useCallback(
        async (uploadId: string) => {
            if (!onFileUpload) {
                return;
            }

            const file = uploadFilesRef.current.get(uploadId);
            if (!file) {
                return;
            }

            const current = uploadItemsRef.current.find((item) => item.id === uploadId);
            if (!current || current.status === 'uploading' || current.status === 'completed') {
                return;
            }

            const controller = new AbortController();
            uploadControllersRef.current.set(uploadId, controller);

            setUploadItems((items) =>
                items.map((item) =>
                    item.id === uploadId
                        ? {
                              ...item,
                              status: 'uploading',
                              startedAt: item.startedAt ?? Date.now(),
                              errorMessage: undefined,
                          }
                        : item,
                ),
            );

            try {
                const progressHandler = ((progress, stats) => {
                    const loadedBytes = stats?.loadedBytes ?? Math.round(Math.min(1, progress) * (file.size || 0));
                    const totalBytes = stats?.totalBytes ?? (file.size || loadedBytes);
                    queueProgressUpdate(uploadId, progress, loadedBytes, totalBytes);
                }) as BookEditorUploadProgressCallback & {
                    onProgress?: BookEditorUploadProgressCallback;
                    abortSignal?: AbortSignal;
                };

                progressHandler.onProgress = progressHandler;
                progressHandler.abortSignal = controller.signal;

                const url = await onFileUpload(file, progressHandler);

                queueProgressUpdate(uploadId, 1, file.size, file.size);
                queueEditorReplacement(uploadId, `KNOWLEDGE ${url}`);

                setUploadItems((items) =>
                    items.map((item) =>
                        item.id === uploadId
                            ? {
                                  ...item,
                                  status: 'completed',
                                  progress: 1,
                                  loadedBytes: item.totalBytes || file.size,
                                  completedAt: Date.now(),
                              }
                            : item,
                    ),
                );
            } catch (error) {
                if (isAbortError(error)) {
                    setUploadItems((items) =>
                        items.map((item) =>
                            item.id === uploadId
                                ? {
                                      ...item,
                                      status: 'paused',
                                      errorMessage: undefined,
                                  }
                                : item,
                        ),
                    );
                } else {
                    console.error(`File upload failed for ${file.name}:`, error);
                    queueEditorReplacement(uploadId, `KNOWLEDGE ❌ Failed to upload ${file.name}`);
                    setUploadItems((items) =>
                        items.map((item) =>
                            item.id === uploadId
                                ? {
                                      ...item,
                                      status: 'failed',
                                      errorMessage: error instanceof Error ? error.message : 'Upload failed',
                                  }
                                : item,
                        ),
                    );
                }
            } finally {
                uploadControllersRef.current.delete(uploadId);
                queueUploadProcessing();
            }
        },
        [onFileUpload, queueEditorReplacement, queueProgressUpdate, queueUploadProcessing, setUploadItems],
    );

    /**
     * Starts queued uploads up to the concurrency limit.
     */
    const processUploadQueue = useCallback(() => {
        if (!onFileUpload) {
            return;
        }

        const currentItems = uploadItemsRef.current;
        const activeCount = currentItems.filter((item) => item.status === 'uploading').length;
        const availableSlots = Math.max(0, DEFAULT_MAX_CONCURRENT_UPLOADS - activeCount);
        if (availableSlots === 0) {
            return;
        }

        const queuedItems = currentItems.filter((item) => item.status === 'queued').slice(0, availableSlots);
        queuedItems.forEach((item) => {
            void startUpload(item.id);
        });
    }, [onFileUpload, startUpload]);

    processUploadQueueRef.current = processUploadQueue;

    /**
     * Pauses a queued or active upload.
     */
    const pauseUpload = useCallback(
        (uploadId: string) => {
            setUploadItems((items) =>
                items.map((item) =>
                    item.id === uploadId && item.status === 'queued'
                        ? {
                              ...item,
                              status: 'paused',
                          }
                        : item,
                ),
            );

            const controller = uploadControllersRef.current.get(uploadId);
            controller?.abort();
        },
        [setUploadItems],
    );

    /**
     * Resumes a paused or failed upload by re-queuing it.
     */
    const resumeUpload = useCallback(
        (uploadId: string) => {
            setUploadItems((items) =>
                items.map((item) =>
                    item.id === uploadId
                        ? {
                              ...item,
                              status: 'queued',
                              progress: 0,
                              loadedBytes: 0,
                              startedAt: null,
                              completedAt: null,
                              errorMessage: undefined,
                          }
                        : item,
                ),
            );

            queueUploadProcessing();
        },
        [queueUploadProcessing, setUploadItems],
    );

    useEffect(() => {
        if (!editor) {
            return;
        }

        const focusListener = editor.onDidFocusEditorWidget(() => {
            setIsFocused(true);
        });

        const blurListener = editor.onDidBlurEditorWidget(() => {
            setIsFocused(false);
        });

        const saveAction = editor.addAction({
            id: 'save-book',
            label: 'Save',
            keybindings: [monaco!.KeyMod.CtrlCmd | monaco!.KeyCode.KeyS],
            run: () => {
                setIsSavedShown(false);
                setTimeout(() => setIsSavedShown(true), 0);
                // Note: We don't prevent default, so browser's save dialog still opens
            },
        });

        return () => {
            focusListener.dispose();
            blurListener.dispose();
            saveAction.dispose();
        };
    }, [editor, monaco]);

    useEffect(() => {
        if (!isSavedShown) {
            return;
        }

        const timer = setTimeout(() => {
            setIsSavedShown(false);
        }, 2000);

        return () => {
            clearTimeout(timer);
        };
    }, [isSavedShown]);

    useEffect(() => {
        return () => {
            if (uploadQueueTimerRef.current !== null) {
                clearTimeout(uploadQueueTimerRef.current);
            }

            if (editorUpdateTimerRef.current !== null) {
                clearTimeout(editorUpdateTimerRef.current);
            }

            if (progressUpdateTimerRef.current !== null) {
                clearTimeout(progressUpdateTimerRef.current);
            }

            for (const controller of uploadControllersRef.current.values()) {
                controller.abort();
            }

            uploadControllersRef.current.clear();
        };
    }, []);

    useEffect(() => {
        if (uploadItems.length === 0) {
            return;
        }

        const hasActive = uploadItems.some((item) => item.status !== 'completed');
        if (hasActive) {
            return;
        }

        const timer = window.setTimeout(() => {
            uploadFilesRef.current.clear();
            uploadDecorationIdsRef.current.clear();
            setUploadItems(() => []);
        }, 1500);

        return () => {
            clearTimeout(timer);
        };
    }, [setUploadItems, uploadItems]);

    useEffect(() => {
        if (!monaco) {
            return;
        }

        // Register a new language
        monaco.languages.register({ id: BOOK_LANGUAGE_ID });

        const commitmentTypes = [...new Set(getAllCommitmentDefinitions().map(({ type }) => type))];
        const commitmentRegex = new RegExp(
            `^\\s*(${commitmentTypes
                .sort((a, b) => b.length - a.length) // [1] Prefer longer commitments to avoid partial matching (e.g. LANGUAGES vs LANGUAGE)
                .map((type) => (type === 'META' ? 'META\\s+\\w+' : type.replace(/\s+/, '\\s+')))
                .join('|')})(?=\\s|$)`, // [2] Use lookahead for space or end of line to ensure exact match
        );

        // Note: Using a broad character set for Latin and Cyrillic to support international characters in parameters.
        //       Monarch tokenizer does not support Unicode property escapes like \p{L}.
        const parameterRegex = /@([a-zA-Z0-9_á-žÁ-Žč-řČ-Řš-žŠ-Žа-яА-ЯёЁ]+)/;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bookRules: any = [
            [/^---[-]*$/, ''], // Horizontal lines get no highlighting
            [/^```.*$/, 'code-block', '@codeblock'],
            ...AGENT_REFERENCE_HIGHLIGHT_REGEXES.map((regex) => [regex, 'agent-reference']),
            [parameterRegex, 'parameter'],
            [/\{[^}]+\}/, 'parameter'],
            [commitmentRegex, 'commitment'],
        ];

        // Register a tokens provider for the language
        const tokenProvider = monaco.languages.setMonarchTokensProvider(BOOK_LANGUAGE_ID, {
            ignoreCase: true,
            tokenizer: {
                root: [
                    [/^\s*$/, 'empty'], // Empty token whitespace lines
                    [/^-*$/, 'line'], // Horizontal lines get no highlighting
                    [/^```.*$/, 'code-block', '@codeblock'],
                    [/^.*$/, 'title', '@body'], // First non-empty, non-horizontal line is title
                    [commitmentRegex, 'commitment'],
                ],
                body: bookRules,
                codeblock: [
                    [/^```.*$/, 'code-block', '@pop'],
                    [/^.*$/, 'code-block'],
                ],
            },
        });

        // Register a completion item provider for the language
        const completionProvider = monaco.languages.registerCompletionItemProvider(BOOK_LANGUAGE_ID, {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const suggestions = commitmentTypes.map((type) => ({
                    label: type,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: type,
                    range: range,
                }));

                return { suggestions: suggestions };
            },
        });

        const linkProvider = monaco.languages.registerLinkProvider(BOOK_LANGUAGE_ID, {
            provideLinks: (model) => {
                const content = model.getValue();
                const links = extractAgentReferenceMatches(content).map((reference) => {
                    const startPos = model.getPositionAt(reference.index);
                    const endPos = model.getPositionAt(reference.index + reference.length);

                    return {
                        range: new monaco.Range(
                            startPos.lineNumber,
                            startPos.column,
                            endPos.lineNumber,
                            endPos.column,
                        ),
                        url: reference.url,
                        tooltip: `Open agent: ${reference.value}`,
                    };
                });

                return { links };
            },
        });

        monaco.editor.defineTheme('book-theme', {
            base: 'vs',
            inherit: true,
            rules: [
                {
                    token: 'title',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.TITLE.toHex(),
                    // [🚚]> fontStyle: 'underline italic',
                    fontStyle: 'bold underline',
                },
                {
                    token: 'commitment',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.COMMITMENT.toHex(),
                    fontStyle: 'bold',
                },
                {
                    token: 'parameter',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.PARAMETER.toHex(),
                    fontStyle: `italic`,
                },
                {
                    token: 'agent-reference',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.COMMITMENT.toHex(),
                    fontStyle: 'underline',
                },
                {
                    token: 'code-block',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex(),
                },
            ],
            colors: {
                'editor.scrollbarSlider.background': '#E0E0E0',
                'editor.scrollbarSlider.hoverBackground': '#D0D0D0',
                'editor.scrollbarSlider.activeBackground': '#C0C0C0',
            },
        });

        monaco.editor.setTheme('book-theme');

        return () => {
            tokenProvider.dispose();
            completionProvider.dispose();
            linkProvider.dispose();
        };
    }, [monaco]);

    useEffect(() => {
        const styleId = `notebook-margin-line-style-${instanceIdRef.current}`; // <-- unique per instance

        let style = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        style.innerHTML = `

            @import url('https://fonts.googleapis.com/css2?family=Bitcount+Grid+Single:wght@100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
            /* <- [🚚] */

            .${instanceClass} .monaco-editor .view-lines {
                background-image: linear-gradient(to bottom, transparent ${
                    scaledLineHeight - 1
                }px, ${PROMPTBOOK_SYNTAX_COLORS.LINE.toHex()} ${scaledLineHeight - 1}px);
                background-size: calc(100% + ${scaledContentPaddingLeft}px) ${scaledLineHeight}px;
                background-position-x: -${scaledContentPaddingLeft}px;
                background-position-y: ${scaledLineHeight * -0.1}px;
            }
            .${instanceClass} .monaco-editor .overflow-guard::before {
                content: '';
                position: absolute;
                left: ${scaledVerticalLineLeft}px;
                top: 0;
                bottom: 0;
                width: 1px;
                background-color: ${PROMPTBOOK_SYNTAX_COLORS.LINE.toHex()};
                z-index: 10;
            }

            .${instanceClass} .monaco-editor .separator-line {
                background: linear-gradient(
                    to bottom, 
                    transparent ${scaledLineHeight * 0.9 - 2}px, 
                    ${PROMPTBOOK_SYNTAX_COLORS.SEPARATOR.toHex()} ${scaledLineHeight * 0.9 - 2}px, 
                    ${PROMPTBOOK_SYNTAX_COLORS.SEPARATOR.toHex()} ${scaledLineHeight * 0.9 + 1}px, 
                    transparent ${scaledLineHeight * 0.9 + 1}px
                );
            }
            
            .${instanceClass} .monaco-editor .transparent-text {
                color: transparent !important;
            }
            
            .${instanceClass} .monaco-editor .code-block-box {
                background-color: #f5f5f566;
                border-left: 1px solid ${PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex()};
                border-right: 1px solid ${PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex()};
                padding-left: ${Math.round(8 * zoomLevel)}px;
                padding-right: ${Math.round(8 * zoomLevel)}px;
            }
            
            .${instanceClass} .monaco-editor .code-block-top {
                border-top: 1px solid ${PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex()};
                border-top-left-radius: ${Math.round(10 * zoomLevel)}px;
                border-top-right-radius: ${Math.round(10 * zoomLevel)}px;
                overflow: hidden;
            }
            
            .${instanceClass} .monaco-editor .code-block-bottom {
                border-bottom: 1px solid ${PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex()};
                border-bottom-left-radius: ${Math.round(10 * zoomLevel)}px;
                border-bottom-right-radius: ${Math.round(10 * zoomLevel)}px;
                overflow: hidden;
            }
        `;

        return () => {
            // Note: Style is not removed on purpose to avoid flickering during development with fast refresh
        };
    }, [scaledLineHeight, scaledContentPaddingLeft, scaledVerticalLineLeft]);

    const decorationIdsRef = useRef<string[]>([]);
    const codeBlockDecorationIdsRef = useRef<string[]>([]);

    useEffect(() => {
        if (!editor || !monaco) {
            return;
        }

        const updateDecorations = () => {
            const model = editor.getModel();
            if (!model) {
                return;
            }

            const text = model.getValue();
            const matches = text.matchAll(/^---[-]*$/gm);
            const newDecorations: editor.IModelDeltaDecoration[] = [];

            for (const match of matches) {
                if (match.index === undefined) {
                    continue;
                }

                const startPos = model.getPositionAt(match.index);
                const endPos = model.getPositionAt(match.index + match[0].length);

                newDecorations.push({
                    range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                    options: {
                        isWholeLine: true,
                        className: 'separator-line',
                        inlineClassName: 'transparent-text',
                    },
                });
            }

            decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, newDecorations);

            // Add decorations for code blocks
            const lines = text.split(/\r?\n/);
            const codeBlockDecorations: editor.IModelDeltaDecoration[] = [];
            let inCodeBlock = false;
            let codeBlockStartLine = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line?.trim().startsWith('```')) {
                    if (!inCodeBlock) {
                        // Starting a code block
                        inCodeBlock = true;
                        codeBlockStartLine = i + 1; // 1-based line number
                    } else {
                        // Ending a code block
                        inCodeBlock = false;
                        const endLine = i + 1; // 1-based line number

                        // Add decorations for each line in the code block
                        for (let j = codeBlockStartLine; j <= endLine; j++) {
                            const isFirst = j === codeBlockStartLine;
                            const isLast = j === endLine;

                            codeBlockDecorations.push({
                                range: new monaco.Range(j, 1, j, 1),
                                options: {
                                    isWholeLine: true,
                                    className: `code-block-box${isFirst ? ' code-block-top' : ''}${
                                        isLast ? ' code-block-bottom' : ''
                                    }`,
                                },
                            });
                        }
                    }
                }
            }

            codeBlockDecorationIdsRef.current = editor.deltaDecorations(
                codeBlockDecorationIdsRef.current,
                codeBlockDecorations,
            );
        };

        updateDecorations();

        const changeListener = editor.onDidChangeModelContent(() => {
            updateDecorations();
        });

        return () => {
            changeListener.dispose();
        };
    }, [editor, monaco]);

    /**
     * Inserts upload placeholders and queues uploads for processing.
     */
    const handleFiles = useCallback(
        async (files: File[]) => {
            if (!onFileUpload || !editor || !monaco) {
                return;
            }

            if (files.length === 0) {
                return;
            }

            const model = editor.getModel();
            if (!model) {
                return;
            }

            const placeholders = files.map((file) => ({
                id: createUploadId(),
                file,
                placeholder: getUploadPlaceholderText(file.name),
            }));

            const prefix = model.getValue() ? '\n' : '';
            const textToAppend = prefix + placeholders.map((entry) => entry.placeholder).join('\n');
            const lastLine = model.getLineCount();
            const lastColumn = model.getLineMaxColumn(lastLine);
            const insertStartOffset = model.getOffsetAt(new monaco.Position(lastLine, lastColumn));

            editor.executeEdits('upload-placeholders', [
                {
                    range: new monaco.Range(lastLine, lastColumn, lastLine, lastColumn),
                    text: textToAppend,
                    forceMoveMarkers: true,
                },
            ]);

            const decorations: editor.IModelDeltaDecoration[] = [];
            let runningOffset = prefix.length;

            for (const entry of placeholders) {
                const startOffset = insertStartOffset + runningOffset;
                const endOffset = startOffset + entry.placeholder.length;
                const startPos = model.getPositionAt(startOffset);
                const endPos = model.getPositionAt(endOffset);

                decorations.push({
                    range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                    options: {
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                    },
                });

                runningOffset += entry.placeholder.length + 1;
            }

            const decorationIds = editor.deltaDecorations([], decorations);

            placeholders.forEach((entry, index) => {
                uploadFilesRef.current.set(entry.id, entry.file);
                const decorationId = decorationIds[index];
                if (decorationId) {
                    uploadDecorationIdsRef.current.set(entry.id, decorationId);
                }
            });

            const newUploadItems: UploadItem[] = placeholders.map((entry) => ({
                id: entry.id,
                fileName: entry.file.name,
                fileSize: entry.file.size,
                status: 'queued',
                progress: 0,
                loadedBytes: 0,
                totalBytes: entry.file.size,
                startedAt: null,
                completedAt: null,
            }));

            setUploadItems((items) => [...items, ...newUploadItems]);

            queueUploadProcessing();
        },
        [onFileUpload, editor, monaco, queueUploadProcessing, setUploadItems],
    );

    /**
     * Handles file drop uploads.
     */
    const handleDrop = useCallback(
        async (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragOver(false);

            const files = Array.from(event.dataTransfer.files);
            await handleFiles(files);
        },
        [handleFiles],
    );

    /**
     * Handles paste uploads.
     */
    const handlePaste = useCallback(
        async (event: React.ClipboardEvent<HTMLDivElement>) => {
            const files = Array.from(event.clipboardData.files);

            if (files.length === 0) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            await handleFiles(files);
        },
        [handleFiles],
    );
    // <- TODO: [✨🏺] !!!! Maybe not working

    /**
     * Opens the document upload input.
     */
    const handleUploadDocument = useCallback(() => {
        if (fileUploadInputRef.current) {
            fileUploadInputRef.current.click();
        }
    }, []);

    /**
     * Opens the camera capture input.
     */
    const handleTakePhoto = useCallback(() => {
        if (cameraInputRef.current) {
            cameraInputRef.current.click();
        }
    }, []);

    /**
     * Handles file selection from hidden inputs.
     */
    const handleFileInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || []);
            handleFiles(files);
            // Reset the input value so the same file can be selected again
            event.target.value = '';
        },
        [handleFiles],
    );

    /**
     * Shows drag overlay while dragging over the editor.
     */
    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    /**
     * Shows drag overlay when entering the editor.
     */
    const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    /**
     * Hides drag overlay when leaving the editor.
     */
    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(false);
    }, []);

    const uploadStats = useMemo<UploadStats>(() => {
        const totalFiles = uploadItems.length;
        const queuedFiles = uploadItems.filter((item) => item.status === 'queued').length;
        const uploadingFiles = uploadItems.filter((item) => item.status === 'uploading').length;
        const pausedFiles = uploadItems.filter((item) => item.status === 'paused').length;
        const failedFiles = uploadItems.filter((item) => item.status === 'failed').length;
        const completedFiles = uploadItems.filter((item) => item.status === 'completed').length;
        const totalBytes = uploadItems.reduce((sum, item) => sum + item.totalBytes, 0);
        const uploadedBytes = uploadItems.reduce((sum, item) => {
            const total = item.totalBytes || 0;
            const loaded = total > 0 ? Math.min(item.loadedBytes, total) : item.loadedBytes;
            return sum + loaded;
        }, 0);
        const progress = totalBytes > 0 ? uploadedBytes / totalBytes : 0;
        const startedAt = uploadItems.reduce((min, item) => {
            if (!item.startedAt) {
                return min;
            }

            return Math.min(min, item.startedAt);
        }, Number.POSITIVE_INFINITY);
        const elapsedMs = Number.isFinite(startedAt) ? Math.max(0, Date.now() - startedAt) : 0;
        const speedBytesPerSecond = elapsedMs > 0 ? uploadedBytes / (elapsedMs / 1000) : 0;

        return {
            totalFiles,
            queuedFiles,
            uploadingFiles,
            pausedFiles,
            failedFiles,
            completedFiles,
            totalBytes,
            uploadedBytes,
            progress,
            elapsedMs,
            speedBytesPerSecond,
        };
    }, [uploadItems]);

    const activeUploadItems = useMemo(() => uploadItems.filter((item) => item.status !== 'completed'), [uploadItems]);

    return (
        <div
            className={classNames(styles.bookEditorContainer, instanceClass)} // <-- add instance-scoped class
            onDrop={handleDrop}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            {(isUploadButtonShown ||
                isCameraButtonShown ||
                isDownloadButtonShown ||
                isAboutButtonShown ||
                isFullscreenButtonShown) && (
                <BookEditorActionbar
                    {...{
                        value,
                        isUploadButtonShown,
                        isCameraButtonShown: isCameraButtonShown ?? isTouchDevice,
                        isDownloadButtonShown,
                        isAboutButtonShown,
                        isFullscreenButtonShown,
                        onFullscreenClick,
                        onUploadDocument: handleUploadDocument,
                        onTakePhoto: handleTakePhoto,
                        isFullscreen,
                    }}
                />
            )}
            <input
                type="file"
                ref={fileUploadInputRef}
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
                multiple
            />
            <input
                type="file"
                ref={cameraInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
            />
            {isDragOver && <div className={styles.dropOverlay}>Drop files to upload</div>}
            {isSavedShown && (
                <div className={styles.savedNotification}>
                    <SaveIcon />
                    Saved
                </div>
            )}
            {activeUploadItems.length > 0 && (
                <div className={styles.uploadPanel} role="status" aria-live="polite">
                    <div className={styles.uploadPanelHeader}>
                        <div className={styles.uploadPanelTitle}>Uploads</div>
                        <div className={styles.uploadPanelHeaderMeta}>
                            {uploadStats.uploadingFiles + uploadStats.queuedFiles} active / {uploadStats.totalFiles}{' '}
                            total
                        </div>
                    </div>
                    <div className={styles.uploadPanelSummary}>
                        <div>
                            Files: {uploadStats.totalFiles} total, {uploadStats.completedFiles} done
                        </div>
                        <div>
                            Data: {formatBytes(uploadStats.uploadedBytes)} / {formatBytes(uploadStats.totalBytes)}
                        </div>
                        <div>
                            Speed:{' '}
                            {uploadStats.speedBytesPerSecond > 0
                                ? `${formatBytes(uploadStats.speedBytesPerSecond)}/s`
                                : '--'}
                        </div>
                        <div>Elapsed: {formatDuration(uploadStats.elapsedMs)}</div>
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
                                        <div className={styles.uploadRowStatus}>
                                            {UPLOAD_STATUS_LABELS[item.status]}
                                        </div>
                                    </div>
                                    <div className={styles.uploadRowMeta}>
                                        <span>
                                            {formatBytes(item.loadedBytes)} / {formatBytes(item.totalBytes)}
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
            )}
            <div
                style={{
                    position: 'relative',
                    flex: 1,
                    height: '100%',
                    width: '100%',
                    // outline: '1px dotted #ff3333'
                }}
            >
                {isTouchDevice && !isFocused && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 20,
                            height: '100%',
                            width: '100%',
                            backgroundColor: 'transparent',
                            // outline: '1px dotted #ff3333',
                        }}
                        onTouchStart={(event) => {
                            // [1] Record the starting position of the touch
                            const touch = event.touches[0];
                            if (touch) {
                                touchStartRef.current = { x: touch.clientX, y: touch.clientY };
                            }
                        }}
                        onTouchEnd={(event) => {
                            event.preventDefault();

                            // [1] Check if this was a tap (not a drag)
                            const touch = event.changedTouches[0];
                            if (touch && touchStartRef.current) {
                                const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
                                const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
                                const threshold = 10; // pixels

                                // [1] Only focus if the touch hasn't moved much (it's a tap)
                                if (deltaX < threshold && deltaY < threshold) {
                                    // alert('Tap inside the book editor to focus and start editing.');
                                    editor?.focus();
                                }
                            }

                            touchStartRef.current = null;
                        }}
                    />
                )}
                <Editor
                    language={BOOK_LANGUAGE_ID}
                    value={value}
                    onMount={(editor) => setEditor(editor)}
                    onChange={(newValue) => onChange?.(newValue as string_book)}
                    options={{
                        readOnly: isReadonly,
                        readOnlyMessage: {
                            value: translations?.readonlyMessage || 'You cannot edit this book',
                        },
                        wordWrap: 'on',
                        minimap: { enabled: false },
                        lineNumbers: 'off',
                        fontSize: scaledFontSize,
                        // TODO: [🚚] Allow to pass font family as prop + [😺] Make the font asset hosted on Promptbook CDN side
                        // <- TODO: [😺]Pass font as asset
                        fontFamily: `"Playfair Display", serif`,
                        // [🚚]> fontFamily: `"Bitcount Grid Single", system-ui`,
                        lineHeight: scaledLineHeight,
                        renderLineHighlight: 'none',
                        // Note: To add little lines between each line of the book, like a notebook page
                        lineDecorationsWidth: scaledContentPaddingLeft,
                        glyphMargin: false,
                        folding: false,
                        lineNumbersMinChars: 0,
                        links: true,
                        scrollbar: {
                            vertical: 'auto',
                            horizontal: 'hidden',
                            verticalScrollbarSize: scaledScrollbarSize,
                            arrowSize: 0,
                            useShadows: false,
                        },
                    }}
                    loading={
                        <div className={styles.loading}>
                            📖{/* <- TODO: [🐱‍🚀] Better visual of loading of `<BookEditor/>` */}
                        </div>
                    }
                />
            </div>
        </div>
    );
}
