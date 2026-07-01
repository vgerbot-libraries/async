import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, dirname, sep } from "node:path";

const distDir = join(import.meta.dirname, "..", "dist");

async function findHtmlFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await findHtmlFiles(fullPath)));
        } else if (entry.name.endsWith(".html")) {
            files.push(fullPath);
        }
    }
    return files;
}

function getRelativePrefix(htmlFilePath) {
    const dir = dirname(htmlFilePath);
    const rel = relative(dir, distDir);
    if (rel === "") return "./";
    return rel.split(sep).join("/") + "/";
}

function rewritePaths(html, prefix) {
    return html
        .replace(/((?:href|src))="\/(?!\/)/g, (_, attr) => `${attr}="${prefix}`)
        .replace(/((?:href|src))="\/\.\//g, (_, attr) => `${attr}="${prefix}`);
}

async function main() {
    const htmlFiles = await findHtmlFiles(distDir);
    let count = 0;
    for (const file of htmlFiles) {
        const prefix = getRelativePrefix(file);
        const html = await readFile(file, "utf-8");
        const rewritten = rewritePaths(html, prefix);
        if (rewritten !== html) {
            await writeFile(file, rewritten, "utf-8");
            count++;
        }
    }
    console.log(`Rewrote paths in ${count} HTML files.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
