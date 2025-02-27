import type { RequireAtLeastOne } from "type-fest";
import { EnvironmentMismatchError } from "../errors/EnvironmentMismatchError";
import type { string_executable_path } from "../types/typeAliases";
import { $isRunningInNode } from "../utils/environment/$isRunningInNode";
import { locateAppOnLinux } from "./platforms/locateAppOnLinux";
import { locateAppOnMacOs } from "./platforms/locateAppOnMacOs";
import { locateAppOnWindows } from "./platforms/locateAppOnWindows";

/**
 * Options for locating any application
 */
export interface LocateAppOptions {
	/**
	 * Name of the application
	 */
	appName: string;

	/**
	 * Name of the executable on Linux
	 */
	linuxWhich?: string;

	/**
	 * Path suffix on Windows
	 */
	windowsSuffix?: string;

	/**
	 * Name of the application on macOS
	 */
	macOsName?: string;
}

/**
 * Locates an application on the system
 *
 * @private within the repository
 */
export function locateApp(
	options: RequireAtLeastOne<
		LocateAppOptions,
		"linuxWhich" | "windowsSuffix" | "macOsName"
	>,
): Promise<string_executable_path | null> {
	if (!$isRunningInNode()) {
		throw new EnvironmentMismatchError(
			"Locating apps works only in Node.js environment",
		);
	}

	const { appName, linuxWhich, windowsSuffix, macOsName } = options;

	if (process.platform === "win32") {
		if (windowsSuffix) {
			return locateAppOnWindows({ appName, windowsSuffix });
		} else {
			throw new Error(`${appName} is not available on Windows.`);
		}
	} else if (process.platform === "darwin") {
		if (macOsName) {
			return locateAppOnMacOs({ macOsName });
		} else {
			throw new Error(`${appName} is not available on macOS.`);
		}
	} else {
		if (linuxWhich) {
			return locateAppOnLinux({ linuxWhich });
		} else {
			throw new Error(`${appName} is not available on Linux.`);
		}
	}
}

/**
 * TODO: [🧠][♿] Maybe export through `@promptbook/node`
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
