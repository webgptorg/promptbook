import { describe, expect, it } from "@jest/globals";
import { extractVariablesFromScript } from "./extractVariablesFromScript";
//import { extractVariablesFromScript } from './extractVariablesFromScript';

describe("extractVariablesFromScript", () => {
	it("should work in supersimple case without any variables", () => {
		expect([...extractVariablesFromScript("")]).toEqual([]);
		expect([...extractVariablesFromScript('"Hello"')]).toEqual([]);
		expect([...extractVariablesFromScript("const a = 1;")]).toEqual([]);
	});

	it("should parse one variable", () => {
		expect([...extractVariablesFromScript("const a = name;")]).toEqual([
			"name",
		]);
		expect([...extractVariablesFromScript("console.log(name);")]).toEqual([
			"name",
		]);
		expect([
			...extractVariablesFromScript("const a = name; const b = name;"),
		]).toEqual(["name"]);
		expect([
			...extractVariablesFromScript(
				"const a = 1; const b = name; const c = name;",
			),
		]).toEqual(["name"]);
	});

	it("should NOT parse custom function", () => {
		expect([...extractVariablesFromScript("foo();")]).toEqual([]);
		expect([...extractVariablesFromScript("foo(name);")]).toEqual(["name"]);
		expect([...extractVariablesFromScript("console.log(name);")]).toEqual([
			"name",
		]);
	});

	it("should parse multiple variables", () => {
		expect([
			...extractVariablesFromScript("console.log(`${greeting} ${name}`);"),
		]).toEqual(["greeting", "name"]);
	});
});
