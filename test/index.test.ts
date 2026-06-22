import { beforeEach, describe, expect, it, vi } from "vitest";
import websearchExtension from "../src/index.js";
import type { ConfigLoadResult } from "../src/websearch/types.js";

type SessionHandler = (event: object, ctx: object) => Promise<void> | void;
type LoadWebsearchConfig = (options: { readonly cwd: string }) => Promise<ConfigLoadResult>;

const loadWebsearchConfig = vi.hoisted(() => vi.fn<LoadWebsearchConfig>());

vi.mock("../src/websearch/config.js", () => ({ loadWebsearchConfig }));

const activeConfig: ConfigLoadResult = {
	ok: true,
	source: "test",
	config: {
		strategy: "priority",
		fallback: true,
		auto: true,
		providers: [{ provider: "duckduckgo-html" }],
	},
};

const missingConfig: ConfigLoadResult = {
	ok: false,
	reason: "missing_config",
	message: "Missing websearch config. Create .pi/websearch.json or ~/.pi/websearch.json before starting pi.",
};

function createTheme() {
	return { fg: (_key: string, value: string) => value };
}

describe("websearch extension UI", () => {
	beforeEach(() => {
		loadWebsearchConfig.mockReset();
		loadWebsearchConfig.mockResolvedValue(activeConfig);
	});

	it("#given default backend #when session starts #then clears startup widget", async () => {
		// given
		let sessionStart: SessionHandler | undefined;
		const setStatus = vi.fn();
		const setWidget = vi.fn();

		// when
		websearchExtension({
			registerTool: vi.fn(),
			registerCommand: vi.fn(),
			on(eventName: string, handler: unknown) {
				if (eventName === "session_start") {
					sessionStart = handler as SessionHandler;
				}
			},
		} as never);
		await sessionStart?.(
			{},
			{
				cwd: "/tmp/no-config",
				model: { provider: "local", api: "openai-completions" },
				ui: { setStatus, setWidget, notify: vi.fn(), theme: createTheme() },
			},
		);

		// then
		expect(setStatus).toHaveBeenCalledWith("pi-websearch", undefined);
		expect(setWidget).toHaveBeenCalledWith("pi-websearch", undefined);
	});

	it("#given provider native model #when session starts #then clears delegated native widget", async () => {
		// given
		let sessionStart: SessionHandler | undefined;
		const setStatus = vi.fn();
		const setWidget = vi.fn();

		// when
		websearchExtension({
			registerTool: vi.fn(),
			registerCommand: vi.fn(),
			on(eventName: string, handler: unknown) {
				if (eventName === "session_start") {
					sessionStart = handler as SessionHandler;
				}
			},
		} as never);
		await sessionStart?.(
			{},
			{
				cwd: "/tmp/no-config",
				model: { provider: "openai", api: "openai-responses" },
				ui: { setStatus, setWidget, notify: vi.fn(), theme: createTheme() },
			},
		);

		// then
		expect(setStatus).toHaveBeenCalledWith("pi-websearch", undefined);
		expect(setWidget).toHaveBeenCalledWith("pi-websearch", undefined);
	});

	it("#given custom OpenAI-compatible provider and missing config #when session starts #then reports missing config", async () => {
		// given
		let sessionStart: SessionHandler | undefined;
		const notify = vi.fn();
		loadWebsearchConfig.mockResolvedValue(missingConfig);

		// when
		websearchExtension({
			registerTool: vi.fn(),
			registerCommand: vi.fn(),
			on(eventName: string, handler: unknown) {
				if (eventName === "session_start") {
					sessionStart = handler as SessionHandler;
				}
			},
		} as never);
		await sessionStart?.(
			{},
			{
				cwd: "/tmp/no-config",
				model: { provider: "apitopia", api: "openai-responses" },
				ui: { setStatus: vi.fn(), setWidget: vi.fn(), notify, theme: createTheme() },
			},
		);

		// then
		expect(loadWebsearchConfig).toHaveBeenCalledWith({ cwd: "/tmp/no-config" });
		expect(notify).toHaveBeenCalledWith(missingConfig.message, "error");
	});
});
