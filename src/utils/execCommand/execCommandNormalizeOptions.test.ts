import { describe, expect, it } from "@jest/globals";
import { DEFAULT_IS_VERBOSE } from "../../config";
import { $execCommandNormalizeOptions } from "./$execCommandNormalizeOptions";

describe("how normalizing exec options works", () => {
	it("can normalize just string command", () => {
		expect($execCommandNormalizeOptions("ls")).toEqual({
			command: "ls",
			args: [],
			cwd: process.cwd(),
			crashOnError: true,
			humanReadableCommand: "ls",
			isVerbose: DEFAULT_IS_VERBOSE,
			timeout: Number.POSITIVE_INFINITY, // <- TODO: [⏳]
		});
	});

	it("can normalize single command", () => {
		expect($execCommandNormalizeOptions({ command: "ls" })).toEqual({
			command: "ls",
			args: [],
			cwd: process.cwd(),
			crashOnError: true,
			humanReadableCommand: "ls",
			isVerbose: DEFAULT_IS_VERBOSE,
			timeout: Number.POSITIVE_INFINITY, // <- TODO: [⏳]
		});
	});
	it("can normalize single command and cwd", () => {
		expect($execCommandNormalizeOptions({ command: "ls", cwd: "./" })).toEqual({
			command: "ls",
			args: [],
			cwd: "./",
			crashOnError: true,
			humanReadableCommand: "ls",
			isVerbose: DEFAULT_IS_VERBOSE,
			timeout: Number.POSITIVE_INFINITY, // <- TODO: [⏳]
		});
	});
	it("can normalize single command and crashOnError", () => {
		expect(
			$execCommandNormalizeOptions({ command: "ls", crashOnError: false }),
		).toEqual({
			command: "ls",
			args: [],
			cwd: process.cwd(),
			crashOnError: false,
			humanReadableCommand: "ls",
			isVerbose: DEFAULT_IS_VERBOSE,
			timeout: Number.POSITIVE_INFINITY, // <- TODO: [⏳]
		});
	});

	it("can normalize single command and array args", () => {
		expect(
			$execCommandNormalizeOptions({ command: "npm", args: ["run", "test"] }),
		).toEqual({
			command: expect.stringMatching(/npm(\.cmd)?/),
			args: ["run", "test"],
			cwd: process.cwd(),
			crashOnError: true,
			humanReadableCommand: "run",
			isVerbose: DEFAULT_IS_VERBOSE,
			timeout: Number.POSITIVE_INFINITY, // <- TODO: [⏳]
		});
	});

	it("can normalize single command and string args", () => {
		expect($execCommandNormalizeOptions({ command: "npm run test" })).toEqual({
			command: expect.stringMatching(/npm(\.cmd)?/),
			args: ["run", "test"],
			cwd: process.cwd(),
			crashOnError: true,
			humanReadableCommand: "run",
			isVerbose: DEFAULT_IS_VERBOSE,
			timeout: Number.POSITIVE_INFINITY, // <- TODO: [⏳]
		});
	});

	it("can normalize single command with args from array and string and also empty args ", () => {
		expect(
			$execCommandNormalizeOptions({
				command: " npm   run ",
				args: ["test"],
				timeout: 1000,
				isVerbose: true,
			}),
		).toEqual({
			command: expect.stringMatching(/npm(\.cmd)?/),
			args: ["run", "test"],
			cwd: process.cwd(),
			crashOnError: true,
			humanReadableCommand: "run",
			isVerbose: true,
			timeout: 1000,
		});
	});

	it("can split arg flags", () => {
		expect($execCommandNormalizeOptions(`git commit -m "Hello World"`)).toEqual(
			{
				command: "git",
				args: ["commit", "-m", '"Hello World"'],
				cwd: process.cwd(),
				crashOnError: true,
				humanReadableCommand: "git",
				isVerbose: DEFAULT_IS_VERBOSE,
				timeout: Number.POSITIVE_INFINITY, // <- TODO: [⏳]
			},
		);
	});

	/* TODO:
    it('can normalize multiple commands', async () => {});
    */
});
