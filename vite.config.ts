import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		react(),
		crx({
			manifest: {
				manifest_version: 3,
				version: "1.0.0",
				name: "slack_message_chrome_extension",
				permissions: ["storage", "cookies", "tabs"],
				host_permissions: ["*://slack.com/"],
				action: {
					default_popup: "index.html",
				},
				content_scripts: [
					{
						matches: ["https://app.slack.com/client/*"],
						js: ["src/content_scripts/index.ts"],
					},
				],
				background: {
					service_worker: "src/background/index.ts",
					type: "module",
				},
			},
		}),
	],
});
