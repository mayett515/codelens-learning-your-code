# Repository tooling

Read the root instructions and `docs/engineering/README.md`.
These tools inspect source and metadata without importing application runtimes.
The leaf schema owns metadata shape; the generated map is derived output.
Keep declaration, source existence, dependency checks and behavioral proof distinct.
Run `npm --prefix tools run check` after changes. Negative fixtures must prove
that a false claim fails; a green repository alone does not establish the guard.
Use temporary fixture directories, never damage application files to test a guard.
