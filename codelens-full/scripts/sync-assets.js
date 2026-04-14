#!/usr/bin/env node
/*
 * Mirror codelens-full/www/ -> codelens-full/android/app/src/main/assets/public/
 *
 * Why this exists:
 *   The project keeps two identical copies of the web bundle — one under
 *   www/ (canonical source) and one packaged into the Android APK. Manual
 *   mirroring has repeatedly caused drift (the Android copy accidentally
 *   getting ahead or behind www/). Run this script instead of copying by
 *   hand. No npm deps — uses only Node built-ins so `node scripts/sync-assets.js`
 *   just works.
 *
 * Usage:
 *   node scripts/sync-assets.js             # sync www -> android
 *   node scripts/sync-assets.js --check     # exit 1 if trees differ
 *
 * Notes:
 *   - Markdown files at the www/ root (architecture docs) are mirrored too.
 *   - Files in the Android public/ tree that no longer exist in www/ are
 *     removed, so renames don't leave orphans.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'www');
const DEST = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public');
const CHECK_ONLY = process.argv.includes('--check');

function walk(dir, base = dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(base, full);
        if (entry.isDirectory()) walk(full, base, out);
        else if (entry.isFile()) out.push(rel);
    }
    return out;
}

function readIfExists(p) {
    try { return fs.readFileSync(p); } catch (_) { return null; }
}

function ensureDirFor(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sync() {
    if (!fs.existsSync(SRC)) {
        console.error(`[sync-assets] source missing: ${SRC}`);
        process.exit(2);
    }

    const srcFiles = new Set(walk(SRC));
    const destFiles = new Set(walk(DEST));

    let copied = 0, removed = 0, identical = 0, diffCount = 0;

    for (const rel of srcFiles) {
        const srcPath = path.join(SRC, rel);
        const destPath = path.join(DEST, rel);
        const srcBuf = fs.readFileSync(srcPath);
        const destBuf = readIfExists(destPath);
        if (destBuf && destBuf.equals(srcBuf)) { identical++; continue; }

        diffCount++;
        if (CHECK_ONLY) {
            console.log(`[diff] ${rel}`);
            continue;
        }
        ensureDirFor(destPath);
        fs.writeFileSync(destPath, srcBuf);
        copied++;
    }

    for (const rel of destFiles) {
        if (srcFiles.has(rel)) continue;
        diffCount++;
        if (CHECK_ONLY) {
            console.log(`[orphan] ${rel}`);
            continue;
        }
        fs.unlinkSync(path.join(DEST, rel));
        removed++;
    }

    if (CHECK_ONLY) {
        if (diffCount > 0) {
            console.error(`[sync-assets] trees differ (${diffCount} files). Run without --check to sync.`);
            process.exit(1);
        }
        console.log(`[sync-assets] OK — trees identical (${identical} files).`);
        return;
    }

    console.log(`[sync-assets] done — ${copied} copied, ${removed} removed, ${identical} unchanged.`);
}

sync();
