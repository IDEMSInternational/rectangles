// Copies the version in package.json into the Xcode project, as Android's
// build.gradle does for itself: MARKETING_VERSION is the "1.2.3" players see,
// and CURRENT_PROJECT_VERSION, the build number that must go up with every
// upload, is the same number as Android's versionCode.
//
// Runs on its own from `npm version` (the "version" script in package.json).
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const { version } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const [major, minor, patch] = version.split(/[.-]/).map(Number);
const build = major * 1000000 + minor * 1000 + patch;

const project = new URL('ios/App/App.xcodeproj/project.pbxproj', root);
writeFileSync(
  project,
  readFileSync(project, 'utf8')
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`),
);
console.log(`iOS version ${version} (build ${build}).`);
