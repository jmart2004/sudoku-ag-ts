// Builds the Android app: the React build pointed at the website's game
// server, synced into the Capacitor project, then packaged by Gradle.
//
//   SITE_URL=https://your-site.onrender.com npm run android:apk
//
// Writes dist/sudoku-race.apk. Pass --open to open Android Studio instead of
// building with Gradle.

import { execSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ANDROID = path.join(ROOT, "android");
const DEFAULT_SITE_URL = "https://sudoku-race.onrender.com";
const isWindows = process.platform === "win32";

const siteUrl = (process.env.SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
const siteHost = new URL(siteUrl).host;
const env = { ...process.env, REACT_APP_SITE_URL: siteUrl };

// Gradle needs a JDK 21 and the Android SDK; find the usual install spots so
// it works without any setup when Android Studio is installed.
function findJdk() {
  if (env.JAVA_HOME) return;
  const roots = isWindows
    ? ["C:/Program Files/Java", "C:/Program Files/Eclipse Adoptium", "C:/Program Files/Android/Android Studio"]
    : ["/usr/lib/jvm", "/Library/Java/JavaVirtualMachines"];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    if (existsSync(path.join(root, "jbr"))) return void (env.JAVA_HOME = path.join(root, "jbr"));
    const jdk = readdirSync(root).filter((d) => /21/.test(d)).sort().pop();
    if (jdk) {
      const home = path.join(root, jdk);
      env.JAVA_HOME = existsSync(path.join(home, "Contents/Home")) ? path.join(home, "Contents/Home") : home;
      return;
    }
  }
}

function findSdk() {
  const sdk =
    env.ANDROID_HOME ??
    env.ANDROID_SDK_ROOT ??
    [
      env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Android/Sdk"),
      env.HOME && path.join(env.HOME, "Library/Android/sdk"),
      env.HOME && path.join(env.HOME, "Android/Sdk"),
    ].find((p) => p && existsSync(p));
  if (!sdk) throw new Error("Android SDK not found. Install Android Studio or set ANDROID_HOME.");
  env.ANDROID_HOME = sdk;
  writeFileSync(path.join(ANDROID, "local.properties"), `sdk.dir=${sdk.replace(/\\/g, "/")}\n`);
}

const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, env, stdio: "inherit" });

console.log(`Building the app against ${siteUrl}`);
run("npx react-scripts build");
run("npx cap sync android");

if (process.argv.includes("--open")) {
  run("npx cap open android");
} else {
  findJdk();
  findSdk();
  const gradlew = path.join(ANDROID, isWindows ? "gradlew.bat" : "gradlew");
  run(`"${gradlew}" assembleDebug -PsiteHost=${siteHost}`, ANDROID);
  mkdirSync(path.join(ROOT, "dist"), { recursive: true });
  const apk = path.join(ROOT, "dist/sudoku-race.apk");
  copyFileSync(path.join(ANDROID, "app/build/outputs/apk/debug/app-debug.apk"), apk);
  console.log(`\nAPK ready: ${apk}`);
}
