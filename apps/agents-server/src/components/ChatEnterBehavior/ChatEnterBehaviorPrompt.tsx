'use client';

import { Portal } from '../Portal/Portal';
import {
    ChatEnterBehaviorOptionCard,
    type ChatEnterBehaviorOptionCardProps,
} from './ChatEnterBehaviorOptionCard';

/**
 * Props for the non-modal first-run Enter-key prompt.
 */
export type ChatEnterBehaviorPromptProps = {
    readonly isOpen: boolean;
    readonly selectedBehavior?: ChatEnterBehaviorOptionCardProps['behavior'];
    readonly onSelectBehavior: (behavior: ChatEnterBehaviorOptionCardProps['behavior']) => void;
    readonly onDismiss: () => void;
};

/**
 * Non-blocking prompt that lets the user choose what Enter does in chat.
 *
 * It intentionally does not render a backdrop, trap focus, or capture keyboard
 * input so typing can continue in the textarea behind it.
 */
export function ChatEnterBehaviorPrompt(props: ChatEnterBehaviorPromptProps) {
    const { isOpen, selectedBehavior, onSelectBehavior, onDismiss } = props;

    if (!isOpen) {
        return null;
    }

    return (
        <Portal>
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[75] flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0px)]">
                <section
                    aria-live="polite"
                    aria-label="Chat keybinding preference"
                    className="pointer-events-auto w-full max-w-5xl rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.45),_transparent_42%),linear-gradient(140deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.97))] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl"
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="max-w-2xl space-y-2">
                                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                                    Keybindings
                                </p>
                                <div className="space-y-1">
                                    <h2 className="text-xl font-semibold text-slate-950">
                                        When you press Enter, should we send the message or add a new line?
                                    </h2>
                                    <p className="text-sm leading-6 text-slate-600">
                                        Choose once for this browser user. The Send button always works.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onDismiss}
                                onMouseDown={(event) => event.preventDefault()}
                                className="self-start rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
                            >
                                Not now
                            </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <ChatEnterBehaviorOptionCard
                                behavior="SEND"
                                isSelected={selectedBehavior === 'SEND'}
                                onClick={() => onSelectBehavior('SEND')}
                                preventMouseFocus
                            />
                            <ChatEnterBehaviorOptionCard
                                behavior="NEWLINE"
                                isSelected={selectedBehavior === 'NEWLINE'}
                                onClick={() => onSelectBehavior('NEWLINE')}
                                preventMouseFocus
                            />
                        </div>
                    </div>
                </section>
            </div>
        </Portal>
    );
}
