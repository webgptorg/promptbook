import { harnessLoginMethods, loginHarness, serviceReadinessProblem, type LoginPlace, type ServiceReadinessProblem } from '../harness/maintenance.js';
import type { HarnessContext, HarnessInspection, HarnessPlugin } from '../harness/types.js';
import { CANCELLED, selectOne, type Choice, type WizardFrame } from './prompts.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * How an attended sign-in of one harness instance ended.
 *
 * @private shared harness sign-in of init and tool setup
 */
export type HarnessSignInOutcome = {
    /** The latest inspection in this terminal's environment (after any sign-in). */
    readonly inspection: HarnessInspection;
    /** What the background service's environment lacks although this terminal is ready, if anything. */
    readonly serviceProblem?: ServiceReadinessProblem;
    /** The caller's exit choice that ended the sign-in before readiness, or `CANCELLED` (Esc or Ctrl+C at the choice). */
    readonly exit?: string | typeof CANCELLED;
};

/**
 * What the background service's environment lacks for an instance that looks ready in this terminal (nothing for an
 * uninstalled or signed-out instance, which is reported by its own inspection).
 *
 * @private shared harness sign-in of init and tool setup
 */
export async function serviceProblemOf(plugin: HarnessPlugin, inspection: HarnessInspection, service: HarnessContext): Promise<ServiceReadinessProblem | undefined> {
    return inspection.installed && inspection.authenticated !== false ? await serviceReadinessProblem(plugin, service) : undefined;
}

/**
 * Attended native sign-in of one harness instance, shared by init and later tool setup: while the instance is signed
 * out (or its sign-in is not visible to the background service), offers the adapter's own methods for this location
 * (remote-compatible ones first on an SSH/browserless host), "check again" and the caller's exits, runs the chosen
 * method in this terminal and rechecks readiness, also in the service's environment. Ends ready, at an exit, or
 * cancelled; never waits without a terminal (callers invoke it only interactively).
 *
 * @private shared harness sign-in of init and tool setup
 */
export async function attendHarnessSignIn(
    terminal: TerminalProfile,
    options: {
        readonly plugin: HarnessPlugin;
        /** The instance as this terminal sees it (its own account context, no ambient API key). */
        readonly context: HarnessContext;
        /** The same instance as the background service sees it after detachment or reboot. */
        readonly service: HarnessContext;
        readonly place: LoginPlace;
        readonly inspection: HarnessInspection;
        readonly serviceProblem?: ServiceReadinessProblem;
        /** Wizard frame of the sign-in choice. */
        readonly frame: () => WizardFrame;
        /** Choices ending the sign-in without readiness (e.g. remove from the selection, defer). */
        readonly exits: readonly Choice<string>[];
        /** Writes one line of progress. */
        readonly say: (text: string) => void;
        /** Called before each choice is shown. */
        readonly onPrompt?: () => void;
    },
): Promise<HarnessSignInOutcome> {
    const { plugin, context, service, place, say } = options;
    const { style } = terminal;
    const marks = symbols(terminal.unicode);
    let inspection = options.inspection;
    let serviceProblem = options.serviceProblem;
    while (inspection.installed && (inspection.authenticated === false || serviceProblem)) {
        options.onPrompt?.();
        // Remote-compatible methods come first on an SSH/browserless host; the owner may still choose another.
        const methods = await harnessLoginMethods(plugin, context, place.location);
        const ordered = place.location === 'remote' ? [...methods.filter((method) => method.remote), ...methods.filter((method) => !method.remote)] : [...methods];
        const remoteReady = place.location === 'local' || ordered.some((method) => method.remote);
        const situation =
            place.location === 'remote'
                ? remoteReady
                    ? ` This is ${place.reason}: you finish sign-in in a browser on your phone or computer.`
                    : ` This is ${place.reason}, and ${plugin.displayName} has no sign-in known to work without a browser here${ordered.length ? '; its own login may wait for a browser on this machine' : ''}.`
                : '';
        const choice = await selectOne(terminal, {
            frame: options.frame(),
            question: `${plugin.displayName}: ${serviceProblem ? `signed in, but ${serviceProblem.summary}. ${serviceProblem.nextAction}` : inspection.summary}${situation}${ordered.length ? '' : ` ${plugin.loginHint}`}`,
            choices: [...ordered.map((method, index) => ({ value: `method-${index}`, label: method.label })), { value: 'recheck', label: 'I logged in another way — check again' }, ...options.exits],
            defaultValue: ordered.length && remoteReady && !serviceProblem ? 'method-0' : 'recheck',
        });
        if (choice === CANCELLED) return { inspection, serviceProblem, exit: CANCELLED };
        const method = choice.startsWith('method-') ? ordered[Number(choice.slice('method-'.length))] : undefined;
        if (method) {
            say(method.instructions);
            say(style.muted(`Waiting for ${plugin.displayName} sign-in… Ctrl+C cancels it and returns here.`));
            const result = await loginHarness(plugin, context, method, { location: place.location, service, write: (text) => terminal.write(text) });
            say(`${result.outcome === 'authenticated' ? style.success(marks.ok) : style.warning(marks.warn)} ${result.diagnostic}`);
        } else if (choice !== 'recheck') return { inspection, serviceProblem, exit: choice };
        inspection = await plugin.inspect(context);
        serviceProblem = await serviceProblemOf(plugin, inspection, service);
    }
    return { inspection, serviceProblem };
}
