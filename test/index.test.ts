import { describe, expect, it, vi } from "vitest";

import websearchExtension, { isWebsearchEnabled } from "../src/index.js";

const ENABLE_ENV = "PI_WEBSEARCH";

describe("websearch extension toggle", () => {
	it("returns true when PI_WEBSEARCH is unset", () => {
		delete process.env[ENABLE_ENV];
		expect(isWebsearchEnabled()).toBe(true);
	});

	it.each(["1", "true", "yes", "on", " TRUE ", "\tYeS\n"])(
		"returns true for truthy PI_WEBSEARCH value %s",
		(envValue) => {
			process.env[ENABLE_ENV] = envValue;
			expect(isWebsearchEnabled()).toBe(true);
		},
	);

	it.each(["0", "false", "no", "off", " OFF ", "\nNo\t"])(
		"returns false for falsy PI_WEBSEARCH value %s",
		(envValue) => {
			process.env[ENABLE_ENV] = envValue;
			expect(isWebsearchEnabled()).toBe(false);
		},
	);

	it("returns true for unknown PI_WEBSEARCH values", () => {
		process.env[ENABLE_ENV] = "definitely";
		expect(isWebsearchEnabled()).toBe(true);
	});

	it("is a no-op when PI_WEBSEARCH is disabled", () => {
		process.env[ENABLE_ENV] = "0";
		const registerTool = vi.fn();
		const on = vi.fn();
		const registerCommand = vi.fn();
		websearchExtension({ registerTool, on, registerCommand } as never);
		expect(registerTool).not.toHaveBeenCalled();
		expect(on).not.toHaveBeenCalled();
		expect(registerCommand).not.toHaveBeenCalled();
	});

	it("registers tool, hooks, and command when PI_WEBSEARCH is unset", () => {
		delete process.env[ENABLE_ENV];
		const registerTool = vi.fn();
		const on = vi.fn();
		const registerCommand = vi.fn();
		websearchExtension({ registerTool, on, registerCommand } as never);
		expect(registerTool).toHaveBeenCalledTimes(1);
		expect(on).toHaveBeenCalledTimes(2);
		expect(registerCommand).toHaveBeenCalledTimes(1);
	});
});
