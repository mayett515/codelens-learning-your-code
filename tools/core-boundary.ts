import fs from 'node:fs';
import path from 'node:path';
import { isBuiltin } from 'node:module';
import ts from 'typescript';
import { walkFiles, type Finding } from './leaf-inventory.ts';
import { repositoryFile, resolveRelativeImport } from './source-facts.ts';

// Includes erased type dependencies. This is package isolation, not the stricter
// runtime-only dependency policy for leaves explicitly classified as decisions.
export function inspectCoreBoundary(root: string): Finding[] {
  const packagePath = 'packages/kordex-core';
  const packageRoot = path.join(root, packagePath);
  const manifestFile = repositoryFile(root, `${packagePath}/package.json`);
  if (!manifestFile) return [];
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const runtime = new Set(Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies }));
  const development = new Set([...runtime, ...Object.keys(manifest.devDependencies ?? {})]);
  const findings: Finding[] = [];
  for (const file of walkFiles(root, packagePath)) {
    const relative = file.slice(packagePath.length + 1);
    const developmentFile = !relative.startsWith('src/') || /(?:^|\/)(__tests__|test)\//.test(relative) || /\.(test|spec)\./.test(relative);
    const add = (message: string) => findings.push({ code: 'CORE_IMPORT_BOUNDARY', file, message });
    const local = (specifier: string) => {
      const resolved = resolveRelativeImport(packageRoot, path.join(root, file), specifier);
      if (!resolved) add(`Unresolved or out-of-package dependency: ${specifier}`);
    };
    const check = (specifier: string) => {
      if (specifier.startsWith('.')) { local(specifier); return; }
      const dependency = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
      if (!(developmentFile ? development : runtime).has(dependency) && !(developmentFile && (isBuiltin(specifier) || dependency === manifest.name))) {
        add(`Undeclared or forbidden ${developmentFile ? 'development' : 'runtime'} dependency: ${specifier}`);
      }
    };
    if (/^tsconfig[^/]*\.json$/.test(relative)) {
      const parsed = ts.parseConfigFileTextToJson(file, fs.readFileSync(path.join(root, file), 'utf8'));
      if (parsed.error) { add('Cannot parse compiler configuration.'); continue; }
      const config = parsed.config;
      for (const base of [config.extends ?? []].flat()) local(base);
      if (config.compilerOptions?.paths || config.compilerOptions?.baseUrl) add('Core compiler aliases need an explicit boundary review.');
      continue;
    }
    if (!/\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(file)) continue;
    const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) check(node.moduleSpecifier.text);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) check(node.argument.literal.text);
      if (ts.isImportEqualsDeclaration(node)) add('Import-equals dependencies are not supported by the core boundary.');
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) check(argument.text);
        else add('Computed import/require cannot establish package isolation.');
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return findings;
}
