// Builds an installable debug APK at ./Rectangles.apk.
// Needs JDK 21 (JAVA_HOME) and the Android SDK (ANDROID_HOME or android/local.properties).
import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const android = join(root, 'android');
const gradlew = `"${join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')}"`;
const run = (command, cwd = root) => execSync(command, { cwd, stdio: 'inherit' });

run('npx ng build');
run('npx cap sync android');
run(`${gradlew} assembleDebug`, android);
copyFileSync(join(android, 'app/build/outputs/apk/debug/app-debug.apk'), join(root, 'Rectangles.apk'));
console.log('\nAPK ready: Rectangles.apk');
