# Kordex Core

Portable profile, branch, proposal, context and correction decisions extracted
without semantic changes on 2026-11-09. The main entry does not select a domain,
register templates, open storage or call a model.

```ts
import { resolveProfileSelection, validateProfileDefinition } from '@kordex/core';
import { codingProfile } from '@kordex/core/profiles/coding';
import { photographyProfile } from '@kordex/core/profiles/photography';
```

The two profiles are optional seed data. Explicit module and codec subpaths keep
existing consumers working; app row conversion is not part of this package.
Codec subpaths also expose the validation helpers needed by those row mappers.
There is one owner for each schema. The main entry exposes domain operations
and validators rather than those mapping-support helpers.

## What this package does not establish

Pure apply functions calculate candidates; they do not persist an accepted
change. In particular, the branch helper does not compare the proposal's saved
snapshot with the current branch. A future transactional use case must reuse
the freshness decision, check current state and commit target, status and audit
atomically. No storage or atomic-execution port is introduced in this extraction.
The existing mobile driver's rollback defect is unchanged.

## Build and verification

Run from this directory with Node 24:

```sh
npm ci
npm run build
npm run typecheck
npm test
npm run verify:isolation
```

The isolation command copies only this package into an empty temporary directory,
installs its own lockfile, builds and tests it, then packs it and installs a second
consumer containing only the package and Zod. Reports remain in the printed
temporary directory. No app checkout, app aliases or app dependencies are copied.

The existing app consumes a packed `file:../packages/kordex-core` dependency with
`install-links=true`. Build core **before** running `npm ci` in `codelens-rn`;
repeat those steps after changing core source. Compiler and Vitest resolve its
built declarations/JavaScript from app `node_modules`. Metro receives that same
in-app package via its existing configuration; native bundling is not verified.
Run `node scripts/check-core-install.cjs` from the app to detect a stale installed
copy and check schema composition with the single shared Zod 4.3.6 instance.

Zod is an exact peer dependency and an exact development dependency. A standalone
development install has its own test copy; the packed consumer has one runtime
copy shared with core. No domain decision uses Zod instance identity as a protocol.

The repository tooling also checks runtime **and type** imports for package
escapes, including tests/configuration. This complements the physically isolated
build; it does not prove every possible dynamic effect or native execution.
