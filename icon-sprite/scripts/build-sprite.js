#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import svgstore from "svgstore";
import { ICONS } from "./used-icons.js";
import { SPRITE_PATH, CUSTOM_SVG_DIR } from "../dist/config.js";

const require = createRequire(import.meta.url);

// 1️⃣ Resolve lucide-static icons
const sample = require.resolve("../../../lucide-static/icons/mail.svg");
const iconsDir = path.dirname(sample);

// 2️⃣ pascal→kebab
function toKebab(s) {
	return s
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}

// 3️⃣ Gather your needed Lucide IDs
const needed = new Set(ICONS.map(toKebab));
const store = svgstore({
	copyAttrs: ["viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "style", "size"],
	svgAttrs: {
		xmlns: "http://www.w3.org/2000/svg",
		"xmlns:xlink": "http://www.w3.org/1999/xlink",
	},
});
const found = new Set();

// 4️⃣ Add only the Lucide icons you actually use
for (const file of fs.readdirSync(iconsDir)) {
	if (!file.endsWith(".svg")) continue;
	const id = file.slice(0, -4);
	if (!needed.has(id)) continue;
	found.add(id);
	store.add(id, fs.readFileSync(path.join(iconsDir, file), "utf8"));
}

// 5️⃣ Optionally include *all* SVGs from your custom folder
const customDir = path.resolve(process.cwd(), CUSTOM_SVG_DIR);
if (fs.existsSync(customDir)) {
	for (const file of fs.readdirSync(customDir)) {
		if (!file.endsWith(".svg")) continue;
		const id = file.slice(0, -4); // "my-icon"
		const svg = fs.readFileSync(path.join(customDir, file), "utf8");
		store.add(id, svg); // <symbol id="my-icon">…
		// Mark custom icons as found so they don't appear as missing
		found.add(id);
		console.log(`🔧 Added custom icon: ${id}`);
	}
}

// 6️⃣ Error on any missing Lucide icon
const missing = [...needed].filter((id) => !found.has(id));
if (missing.length) {
	throw new Error(`❌ Missing icons: ${missing.join(", ")}`);
}

// 7️⃣ Write a fresh sprite (inline: true drops xml/doctype)
const sprite = store.toString({ inline: true });
const outDir = path.join(process.cwd(), "public");
const outFile = path.join(outDir, SPRITE_PATH);

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
fs.writeFileSync(outFile, sprite, "utf8");

console.log(`✅ Built ${SPRITE_PATH} with ${found.size} Lucide + custom icons.`);
