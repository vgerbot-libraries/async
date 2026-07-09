// @ts-check

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, "../content/docs");

/**
 * Custom sidebar labels for pages whose frontmatter `title`
 * is only the primary API name but the sidebar should show aliases.
 */
/** @type {Record<string, string>} */
const labelOverrides = {
    "reference/control-flow/parallel": "parallel / all",
    "reference/collections/concat": "concat / flatMap",
    "reference/collections/detect": "detect / find",
    "reference/control-flow/whilst": "whilst / until",
    "reference/utils/compose": "compose / seq",
};

/**
 * Parse the `title` field from a markdown file's YAML frontmatter.
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
function readFrontmatter(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    /** @type {Record<string, string>} */
    const fm = {};
    for (const line of match[1].split(/\r?\n/)) {
        const m = line.match(/^(\w+):\s*(.+)$/);
        if (m) fm[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
    }
    return fm;
}

/**
 * Convert a relative file path (from DOCS_DIR) to a Starlight slug.
 * `reference/collections/index.md` → `reference/collections`
 * `reference/collections/map.md`    → `reference/collections/map`
 * @param {string} relPath
 * @returns {string}
 */
function toSlug(relPath) {
    const withoutExt = relPath.replace(/\.mdx?$/, "");
    const parts = withoutExt.split(path.sep);
    if (parts[parts.length - 1] === "index") parts.pop();
    return parts.join("/");
}

/**
 * Convert a kebab-case directory name to a human-readable label.
 * `control-flow` → `Control Flow`
 * @param {string} dirName
 * @returns {string}
 */
function dirToLabel(dirName) {
    return dirName
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/**
 * Resolve a slug to its file path on disk.
 * @param {string} slug
 * @returns {string | null}
 */
function resolveFile(slug) {
    const base = path.join(DOCS_DIR, slug);
    if (fs.existsSync(base + ".md")) return base + ".md";
    if (fs.existsSync(base + ".mdx")) return base + ".mdx";
    if (fs.existsSync(path.join(base, "index.md")))
        return path.join(base, "index.md");
    if (fs.existsSync(path.join(base, "index.mdx")))
        return path.join(base, "index.mdx");
    return null;
}

/**
 * Create a sidebar link item from a slug, reading the label from
 * frontmatter `title` (or `labelOverrides` if present).
 * @param {string} slug
 * @returns {{ label: string; slug: string }}
 */
function link(slug) {
    if (labelOverrides[slug]) return { label: labelOverrides[slug], slug };
    const file = resolveFile(slug);
    if (file) {
        const fm = readFrontmatter(file);
        if (fm.title) return { label: fm.title, slug };
    }
    return { label: slug, slug };
}

/**
 * Scan a single directory for markdown files and return sidebar link items.
 * `index.md` becomes an "Overview" entry (first), remaining files are alphabetical.
 * @param {string} dirRel  — relative path from DOCS_DIR
 * @param {{ exclude?: string[] }} [opts]
 * @returns {{ label: string; slug: string }[]}
 */
function scanDir(dirRel, opts) {
    const exclude = opts?.exclude ?? [];
    const dirAbs = path.join(DOCS_DIR, dirRel);
    if (!fs.existsSync(dirAbs)) return [];

    const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    const items = [];

    // index.md / index.mdx → "Overview" (always first)
    const indexEntry = entries.find(
        (e) => e.isFile() && /^index\.mdx?$/i.test(e.name),
    );
    if (indexEntry) {
        items.push({
            label: "Overview",
            slug: toSlug(path.join(dirRel, indexEntry.name)),
        });
    }

    // Other markdown files, sorted alphabetically by filename
    const mdFiles = entries
        .filter(
            (e) =>
                e.isFile() &&
                /\.mdx?$/i.test(e.name) &&
                !/^index\.mdx?$/i.test(e.name) &&
                !exclude.includes(e.name.replace(/\.mdx?$/i, "")),
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of mdFiles) {
        const slug = toSlug(path.join(dirRel, entry.name));
        items.push(link(slug));
    }

    return items;
}

/**
 * Scan the `reference/` directory: each subdirectory becomes a nested
 * sidebar group. The subgroup label is read from the subdirectory's
 * `index.md` frontmatter title, falling back to the directory name.
 * @param {string} dirRel
 * @returns {{ label: string; items: unknown[] }[]}
 */
function scanReferenceSubgroups(dirRel) {
    const dirAbs = path.join(DOCS_DIR, dirRel);
    const entries = fs.readdirSync(dirAbs, { withFileTypes: true });

    const subdirs = entries
        .filter((e) => e.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name));

    return subdirs.map((subdir) => {
        const subRel = path.join(dirRel, subdir.name);
        let label = dirToLabel(subdir.name);
        const indexFile = path.join(DOCS_DIR, subRel, "index.md");
        if (fs.existsSync(indexFile)) {
            const fm = readFrontmatter(indexFile);
            if (fm.title) label = fm.title;
        }
        return { label, items: scanDir(subRel) };
    });
}

/**
 * Generate the full Starlight sidebar config by scanning the docs directory.
 * @returns {any[]}
 */
export function generateSidebar() {
    return [
        {
            label: "Getting Started",
            items: [
                ...scanDir("getting-started"),
                link("guides/choosing-apis"),
            ],
        },
        {
            label: "Guides",
            items: scanDir("guides", { exclude: ["choosing-apis"] }),
        },
        {
            label: "Reference",
            items: scanReferenceSubgroups("reference"),
        },
    ];
}
