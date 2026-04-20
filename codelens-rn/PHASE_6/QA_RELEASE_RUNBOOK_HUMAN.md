# Phase 6 QA Runbook (Human Version)

## What this is
This is the test guide for Phase 6 of CodeLens (backup, restore, clear data, and failure recovery).

If you have never seen the app before, this guide still works. It tells you:
- what to do
- where to do it
- what PASS means
- why each step matters

## Why we do this
Phase 6 is about user data safety. If this fails, users can lose learning data or get stuck after a bad restore.

This runbook proves:
1. Backup files are complete and valid.
2. Restore works on a clean install.
3. Clear-all-data works safely in both key modes.
4. Bad files and interruptions do not brick the app.
5. The app still works normally after restore.

## Scope of this QA
- Build under test: commit `e58a317`.
- Devices: at least 1 physical Android and 1 physical iOS.
- Feature areas: Export backup, Restore backup, Clear all data, post-restore smoke flow.

## Quick app context (for new testers)
- `Project`: imported or pasted code workspace.
- `File`: source file inside a project.
- `Mark/Range`: highlighted code section.
- `General chat`: chat not tied to code section.
- `Section chat`: chat tied to selected code.
- `Learning concept`: concept saved from a chat bubble.
- `Learning session`: grouped save event for concepts.
- `Embedding`: 384-float vector used for semantic retrieval.

## Pass/Fail policy
- Any P0 failure on either platform = `BLOCK` release.
- P1 failures can be ship blockers only if they break core user flows.

## Test flow map
Run steps in this order:
1. Preflight
2. Create Golden Dataset
3. Export and audit backup archive
4. Fresh install restore
5. Clear-all-data tests
6. Failure path tests
7. Interruption test
8. Post-restore functional smoke

---

## Step 1 - Preflight
### What to do
1. Use build from commit `e58a317`.
2. Prepare one physical Android and one physical iOS.
3. Start a note table with these counts:
   `projects, files, chats, chat_messages, learning_sessions, concepts, concept_links, embeddings`

### Why this matters
You need a trusted baseline. Without baseline counts, you cannot prove restore parity later.

### PASS if
- Both devices are ready.
- Baseline table exists before testing begins.

---

## Step 2 - Create Golden Dataset (Device A)
### What to do
1. Open `Settings`.
2. Save both API keys (dummy values are okay).
3. Change one chat model and one embedding model to non-default values.
4. Create 2 projects:
   - one from paste
   - one from GitHub import path (if available)
5. Create at least 4 files total with marks/ranges.
6. Create 1 general chat with 4+ messages.
7. Create 1 section chat with 4+ messages.
8. Save at least 3 chat bubbles as learning.
9. Open Learning Hub and confirm Concepts and Sessions are non-zero.
10. Run Dev screen smoke once (`Run RAG Smoke Test`).

### Why this matters
A tiny dataset can hide bugs. This creates enough cross-linked data to detect missing rows, broken links, and vector issues.

### PASS if
- All entities exist with non-zero data.
- Dev smoke passes once before export.

---

## Step 3 - Export + Tear Apart Archive
### What to do
1. On Device A: `Settings -> Data -> Export backup`.
2. Save the `.codelens` file to desktop.
3. On desktop, run this PowerShell audit script:

```powershell
$src = "C:\path\to\codelens-backup-YYYY-MM-DD.codelens"
$work = "$env:TEMP\codelens_audit"
if (Test-Path $work) { Remove-Item -Recurse -Force $work }
New-Item -ItemType Directory -Path $work | Out-Null
Copy-Item $src "$work\backup.zip"
Expand-Archive -LiteralPath "$work\backup.zip" -DestinationPath "$work\unzipped" -Force

$required = @(
  "metadata.json","preferences.json","secure_keys.json",
  "projects.ndjson","files.ndjson","chats.ndjson","chat_messages.ndjson",
  "learning_sessions.ndjson","concepts.ndjson","concept_links.ndjson"
)
$missing = $required | Where-Object { -not (Test-Path "$work\unzipped\$_") }
"Missing files: $($missing -join ', ')"

$meta = Get-Content "$work\unzipped\metadata.json" -Raw | ConvertFrom-Json
$meta | ConvertTo-Json -Depth 5

function Count-Ndjson([string]$p) {
  if (-not (Test-Path $p)) { return 0 }
  return ((Get-Content $p) | Where-Object { $_.Trim().Length -gt 0 }).Count
}
@{
  projects = Count-Ndjson "$work\unzipped\projects.ndjson"
  files = Count-Ndjson "$work\unzipped\files.ndjson"
  chats = Count-Ndjson "$work\unzipped\chats.ndjson"
  chat_messages = Count-Ndjson "$work\unzipped\chat_messages.ndjson"
  learning_sessions = Count-Ndjson "$work\unzipped\learning_sessions.ndjson"
  concepts = Count-Ndjson "$work\unzipped\concepts.ndjson"
  concept_links = Count-Ndjson "$work\unzipped\concept_links.ndjson"
} | ConvertTo-Json

node -e "const fs=require('fs');const p='$work\\\\unzipped\\\\concepts.ndjson';const lines=fs.readFileSync(p,'utf8').split('\n').filter(Boolean).map(JSON.parse);const e=lines.find(x=>x.embedding);if(!e){console.log('No embedded concepts found');process.exit(0)};const len=Buffer.from(e.embedding.vectorBase64,'base64').length;console.log('First embedding bytes:',len,'(expect 1536)')"
```

4. Confirm:
   - `metadata.magic` is `codelens-backup`
   - `formatVersion = 1`
   - `schemaVersion = 2`
   - NDJSON counts match metadata counts
   - at least one embedding decodes to `1536` bytes

### Why this matters
It catches backup corruption before we ever test restore.

### PASS if
Archive structure, metadata, NDJSON counts, and embedding payload checks all pass.

---

## Step 4 - Fresh Install Restore (Critical)
### What to do
1. Prepare a clean target install.
   - Android: clear app storage or reinstall.
   - iOS: uninstall and reinstall.
2. Confirm app opens empty (no projects).
3. Go to `Settings -> Data -> Restore from backup`.
4. Pick known-good `.codelens`.
5. Confirm restore modal counts and finish.
6. Verify restored UI data:
   - projects
   - recent chats
   - learning concepts/sessions
   - chat histories
7. Verify API keys are not restored as secrets:
   - settings asks for keys again
   - restore modal lists missing providers

### Why this matters
This is the main disaster-recovery promise to users.

### PASS if
Data returns correctly on fresh install, and key handling behavior matches design.

---

## Step 5 - Clear-All Data Tests
### What to do
1. Run clear-all-data with API-key checkbox OFF.
2. Type `DELETE` exactly.
3. Confirm `All data cleared` and verify app data is gone.
4. Verify API keys remain available.
5. Re-import backup.
6. Run clear-all-data with API-key checkbox ON.
7. Type `DELETE`.
8. Re-open settings and verify keys are wiped.

### Why this matters
This protects both user safety and user convenience (optional key retention).

### PASS if
- OFF mode keeps keys.
- ON mode removes keys.
- Data wipes correctly in both modes.

---

## Step 6 - Failure Path Tests
### What to do
Run each case:
1. Cancel document picker during restore.
2. Restore random non-zip file.
3. Restore zip missing `metadata.json`.
4. Restore archive with higher `formatVersion`.
5. Restore corrupted NDJSON (truncate one line in `concepts.ndjson`).

Expected each time:
- no crash
- clear error feedback (`Restore failed: ...`)
- app remains usable

### Why this matters
Most real user failures come from bad files and canceled actions.

### PASS if
All failure paths fail safely without crashing or corrupting state.

---

## Step 7 - Interruption / Kill Tests
### What to do
1. Start restore of a larger archive.
2. Force-kill app during restore spinner.
3. Re-open app.
4. Confirm no crash loop and consistent state.
5. Run restore again and confirm success.

### Why this matters
Mobile apps get killed by OS/users. Restore flow must survive interruption.

### PASS if
App reopens cleanly and restore can still be completed.

---

## Step 8 - Post-Restore Functional Smoke
### What to do
1. Send one new general chat message.
2. Save one bubble as learning.
3. Open learning chat for that concept.
4. Run Dev smoke test once.

### Why this matters
Proves core functionality still works after destructive and recovery flows.

### PASS if
No runtime errors and learning retrieval still works.

---

## Evidence checklist (minimum)
Capture at least:
- Device models + OS versions.
- Commit hash under test.
- Pre vs post parity counts table.
- Restore-complete modal screenshot.
- Error screenshots for failure-path cases.
- Final verdict: `SHIP` or `BLOCK` with reasons.

## Final gate template
- Verdict: `SHIP` or `BLOCK`
- Must fix before ship:
- Nice to have:
- Tester:
- Date/time:

## Notes
Use the neon tracker page for live execution notes:
- `PHASE_6/QA_RELEASE_CHECKLIST_NEON.html`

This Markdown is the plain-language source of truth for what to test and why.
