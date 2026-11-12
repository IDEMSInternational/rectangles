// Builds the release bundle for Google Play at ./Rectangles.aab.
// Needs JDK 21 (JAVA_HOME) and the Android SDK (ANDROID_HOME or android/local.properties).
//
// Google Play only accepts a bundle signed with the app's upload key. To sign,
// set these environment variables first (the key is never committed):
//   ANDROID_KEYSTORE           path to the upload keystore (.jks)
//   ANDROID_KEYSTORE_PASSWORD  the keystore's password
//   ANDROID_KEY_ALIAS          the key's alias in the keystore
//   ANDROID_KEY_PASSWORD       the key's password, if not the keystore's
// Without them, the bundle is built unsigned (fine for checking the build).
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = join(import.meta.dirname, '..');
const android = join(root, 'android');
const gradlew = `"${join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')}"`;
const run = (command, cwd = root) => execSync(command, { cwd, stdio: 'inherit' });

const keystore = process.env.ANDROID_KEYSTORE;
if (keystore) {
  if (!existsSync(resolve(keystore))) throw new Error(`ANDROID_KEYSTORE not found: ${keystore}`);
  for (const name of ['ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS']) {
    if (!process.env[name]) throw new Error(`ANDROID_KEYSTORE is set, so ${name} is needed too`);
  }
  process.env.ANDROID_KEYSTORE = resolve(keystore); // Gradle resolves paths from android/app
}

run('npx ng build');
run('npx cap sync android');
run(`${gradlew} bundleRelease`, android);
copyFileSync(
  join(android, 'app/build/outputs/bundle/release/app-release.aab'),
  join(root, 'Rectangles.aab'),
);
console.log(
  keystore
    ? '\nSigned bundle ready: Rectangles.aab'
    : '\nUnsigned bundle ready: Rectangles.aab (set ANDROID_KEYSTORE etc. to sign it for Google Play)',
);
