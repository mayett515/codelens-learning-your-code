#!/usr/bin/env node
/**
 * Environment health check for CodeLens RN.
 * Run: npm run doctor
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    const result = fn();
    if (result === true || typeof result === "string") {
      const detail = typeof result === "string" ? ` (${result})` : "";
      console.log(`  PASS  ${label}${detail}`);
      passed++;
    } else {
      console.log(`  FAIL  ${label}`);
      if (typeof result === "object" && result.hint) {
        console.log(`         -> ${result.hint}`);
      }
      failed++;
    }
  } catch (e) {
    console.log(`  FAIL  ${label}`);
    console.log(`         -> ${e.message}`);
    failed++;
  }
}

console.log("\nCodeLens RN Doctor\n" + "=".repeat(50));

// ── Java ──
console.log("\nJava:");
check("JAVA_HOME is set", () => {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;
  // Check Android Studio bundled JDK as fallback
  const asBundled = "C:\\Program Files\\Android\\Android Studio\\jbr";
  if (fs.existsSync(path.join(asBundled, "bin", "java.exe"))) {
    return {
      hint: `Not set, but found Android Studio JDK at ${asBundled}. Set JAVA_HOME to this path.`,
    };
  }
  return { hint: "Set JAVA_HOME to your JDK path." };
});

check("java on PATH", () => {
  try {
    const out = execSync("java -version 2>&1", { encoding: "utf8" });
    const match = out.match(/version "([^"]+)"/);
    return match ? `v${match[1]}` : true;
  } catch {
    // Check Android Studio bundled JDK
    const asBundled =
      "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\java.exe";
    if (fs.existsSync(asBundled)) {
      return {
        hint: `Not on PATH, but found at ${asBundled}. Add %JAVA_HOME%\\bin to PATH.`,
      };
    }
    return { hint: "Install a JDK (17+) or add it to PATH." };
  }
});

// ── Android SDK ──
console.log("\nAndroid SDK:");
check("ANDROID_HOME is set", () => {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  const defaultPath = path.join(
    process.env.LOCALAPPDATA || "",
    "Android",
    "Sdk"
  );
  if (fs.existsSync(defaultPath)) {
    return {
      hint: `Not set, but SDK found at ${defaultPath}. Set ANDROID_HOME to this path.`,
    };
  }
  return {
    hint: "Set ANDROID_HOME to your Android SDK path (e.g. %LOCALAPPDATA%\\Android\\Sdk).",
  };
});

check("adb on PATH", () => {
  try {
    const out = execSync("adb version 2>&1", { encoding: "utf8" });
    const match = out.match(/version ([\d.]+)/);
    return match ? `v${match[1]}` : true;
  } catch {
    const sdkDir =
      process.env.ANDROID_HOME ||
      path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
    const adbPath = path.join(sdkDir, "platform-tools", "adb.exe");
    if (fs.existsSync(adbPath)) {
      return {
        hint: `Not on PATH, but found at ${path.dirname(adbPath)}. Add %ANDROID_HOME%\\platform-tools to PATH.`,
      };
    }
    return { hint: "Install Android SDK platform-tools or add to PATH." };
  }
});

// ── op-sqlite config ──
// Note: op-sqlite v15+ has no Expo config plugin (no app.plugin.js).
// Configuration is read from the root "op-sqlite" key in package.json
// by the native build files (podspec / build.gradle) directly.
console.log("\nop-sqlite:");

check("sqliteVec enabled in package.json op-sqlite key", () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  );
  if (!pkg["op-sqlite"])
    return {
      hint: 'Add "op-sqlite": {"sqliteVec": true} to the root of package.json.',
    };
  if (!pkg["op-sqlite"].sqliteVec)
    return {
      hint: 'Set "sqliteVec": true in the package.json "op-sqlite" key.',
    };
  return true;
});

// ── local.properties plugin ──
console.log("\nBuild config:");
check("with-local-properties plugin registered", () => {
  const appJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, "app.json"), "utf8")
  );
  const plugins = appJson?.expo?.plugins || [];
  const found = plugins.find(
    (p) =>
      p === "./plugins/with-local-properties" ||
      p === "./plugins/with-local-properties.js" ||
      (Array.isArray(p) &&
        (p[0] === "./plugins/with-local-properties" ||
          p[0] === "./plugins/with-local-properties.js"))
  );
  if (!found)
    return {
      hint: 'Add "./plugins/with-local-properties" to expo.plugins in app.json.',
    };
  return true;
});

// ── Summary ──
console.log("\n" + "=".repeat(50));
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nFix the FAIL items above before running expo prebuild.\n");
  process.exit(1);
} else {
  console.log("\nAll checks passed. Ready to build.\n");
}
