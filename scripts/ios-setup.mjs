/**
 * Gör iPhone-projektet redo för App Store. Körs automatiskt av `npm run ios:build`
 * (efter `npx cap add ios` på en Mac). Kan köras flera gånger – lägger bara till det som saknas.
 *
 * Lägger in i ios/App/App/Info.plist:
 *  - Texter som iPhone visar när appen frågar om kamera/bilder (kvittofoto, profilbild).
 *    Saknas de kraschar appen när man trycker "Bifoga kvitto", och Apple nekar appen.
 *  - Länken se.dejz.app:// så att Google/Apple-inloggningen kan hoppa tillbaka till appen.
 *  - Att appen bara använder vanlig HTTPS (slipper exportfrågan om kryptering vid varje uppladdning).
 */
import fs from 'fs';
import path from 'path';

const plistPath = path.resolve('ios/App/App/Info.plist');
if (!fs.existsSync(plistPath)) {
  console.log('ios-setup: ingen iOS-app än (kör "npx cap add ios" på en Mac först). Hoppar över.');
  process.exit(0);
}

const ENTRIES = [
  ['NSCameraUsageDescription', '<string>Dejz använder kameran när du fotograferar ett kvitto.</string>'],
  ['NSPhotoLibraryUsageDescription', '<string>Dejz behöver dina bilder när du bifogar ett kvitto eller väljer profilbild.</string>'],
  ['ITSAppUsesNonExemptEncryption', '<false/>'],
  [
    'CFBundleURLTypes',
    `<array>
		<dict>
			<key>CFBundleURLName</key>
			<string>se.dejz.app</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>se.dejz.app</string>
			</array>
		</dict>
	</array>`,
  ],
];

let plist = fs.readFileSync(plistPath, 'utf8');
const added = [];
for (const [key, value] of ENTRIES) {
  if (plist.includes(`<key>${key}</key>`)) continue;
  const end = plist.lastIndexOf('</dict>');
  plist = `${plist.slice(0, end)}\t<key>${key}</key>\n\t${value}\n${plist.slice(end)}`;
  added.push(key);
}
fs.writeFileSync(plistPath, plist);
console.log(added.length ? `ios-setup: lade till ${added.join(', ')}` : 'ios-setup: allt fanns redan');
