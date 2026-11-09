import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export function repositoryFile(root: string, relative: string): string | undefined {
  const resolvedRoot = fs.realpathSync.native(root);
  const candidate = path.resolve(resolvedRoot, relative);
  const inside = (value: string) => {
    const rel = path.relative(resolvedRoot, value);
    return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
  };
  if (!inside(candidate) || !fs.existsSync(candidate)) return undefined;
  const real = fs.realpathSync.native(candidate);
  // Enforce the on-disk spelling on case-insensitive hosts as well as Linux.
  return real === candidate && inside(real) && fs.statSync(real).isFile() ? real : undefined;
}

export function sourceFacts(file: string) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const valueExports = new Set<string>();
  const localValues = new Set<string>();
  const imports: string[] = [];
  let dynamicDependency = false;
  for (const statement of source.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (modifiers?.some((item) => item.kind === ts.SyntaxKind.DeclareKeyword)) continue;
    if (((ts.isFunctionDeclaration(statement) && statement.body) || ts.isClassDeclaration(statement) ||
      (ts.isEnumDeclaration(statement) && !modifiers?.some((item) => item.kind === ts.SyntaxKind.ConstKeyword))) && statement.name) {
      localValues.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const item of statement.declarationList.declarations) {
        if (ts.isIdentifier(item.name) && item.initializer) localValues.add(item.name.text);
      }
    }
  }
  for (const statement of source.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (modifiers?.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) {
      if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) &&
        statement.name && localValues.has(statement.name.text) &&
        !modifiers.some((item) => item.kind === ts.SyntaxKind.DefaultKeyword)) valueExports.add(statement.name.text);
      if (ts.isVariableStatement(statement)) {
        for (const item of statement.declarationList.declarations) {
          if (ts.isIdentifier(item.name) && localValues.has(item.name.text)) valueExports.add(item.name.text);
        }
      }
    }
    if (ts.isExportDeclaration(statement)) {
      if (!statement.isTypeOnly && !statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const item of statement.exportClause.elements) {
          if (!item.isTypeOnly && localValues.has((item.propertyName ?? item.name).text)) valueExports.add(item.name.text);
        }
      }
      const runtimeExport = !statement.isTypeOnly && (!statement.exportClause ||
        !ts.isNamedExports(statement.exportClause) || statement.exportClause.elements.some((item) => !item.isTypeOnly));
      if (runtimeExport && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        imports.push(statement.moduleSpecifier.text);
      }
    }
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const clause = statement.importClause;
      const onlyNamedTypes = clause && !clause.name && clause.namedBindings &&
        ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length > 0 &&
        clause.namedBindings.elements.every((item) => item.isTypeOnly);
      if (!clause?.isTypeOnly && !onlyNamedTypes) imports.push(statement.moduleSpecifier.text);
    }
    if (ts.isImportEqualsDeclaration(statement) && !statement.isTypeOnly) dynamicDependency = true;
  }
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) dynamicDependency = true;
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { valueExports, imports, dynamicDependency };
}

const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs'];
export function resolveRelativeImport(root: string, from: string, specifier: string): string | undefined {
  const target = path.resolve(path.dirname(from), specifier);
  const stem = target.replace(/\.(?:mjs|cjs|js)$/, '');
  const candidates = [target, ...sourceExtensions.map((ext) => stem + ext),
    ...sourceExtensions.map((ext) => path.join(target, 'index' + ext))];
  for (const candidate of candidates) {
    const file = repositoryFile(root, path.relative(root, candidate));
    if (file) return file;
  }
  return undefined;
}

// This guards dependency shape for declared decision owners, not mathematical purity.
export function decisionDependencyProblems(root: string, entry: string): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  function visit(file: string) {
    if (seen.has(file)) return;
    seen.add(file);
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const facts = sourceFacts(file);
    if (facts.dynamicDependency) problems.push(`${relative}: dynamic import/require needs an explicit boundary decision`);
    for (const specifier of facts.imports) {
      // Non-relative runtime dependencies require deliberate adoption, not a silent allowlist.
      if (!specifier.startsWith('.')) {
        problems.push(`${relative}: decision depends on external/aliased runtime import ${specifier}`);
        continue;
      }
      const dependency = resolveRelativeImport(root, file, specifier);
      if (!dependency) { problems.push(`${relative}: unresolved runtime import ${specifier}`); continue; }
      const dependencyPath = path.relative(root, dependency).replaceAll('\\', '/');
      if (/(^|\/)(data|db|ai|adapters|ui|hooks|stores|state)(\/|$)/.test(dependencyPath)) {
        problems.push(`${relative}: decision reaches effect/presentation directory ${dependencyPath}`);
      } else visit(dependency);
    }
  }
  visit(entry);
  return problems;
}
