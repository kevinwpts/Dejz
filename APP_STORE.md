# Dejz i App Store – checklista

Senast uppdaterad: 2026-11-11

Det här är allt som behövs för att Dejz ska godkännas i App Store. Det som går att göra i koden är redan gjort. Det som bara du kan göra står längre ned, i den ordning du gör det.

---

## ✅ Redan fixat i koden

| Krav från Apple | Status |
|---|---|
| Radera konto direkt i appen (regel 5.1.1 v) | ✅ Inställningar → Data & säkerhet → Radera konto. Raderar hela kontot, inte bara data. |
| Integritetspolicy med egen adress | ✅ https://dejz.se/integritet |
| Användarvillkor med egen adress | ✅ https://dejz.se/villkor |
| Support-sida | ✅ https://dejz.se/support |
| "Fortsätt med Apple" när Google-inloggning finns (regel 4.8) | ✅ Färdig i koden, slås på när du gjort steg 4 nedan |
| Inga funktioner som inte fungerar (regel 2.1) | ✅ Vänner & chatt är avstängt (saknar server). Delad budget syns inte för nya användare. |
| Nämner inte andra plattformar (regel 2.3.10) | ✅ Google Play-märken borttagna |
| Ingen marknadsföringssida i appen | ✅ Appen öppnar direkt på registrering/inloggning |
| Fungerar i appen, inte bara på webben | ✅ Alla serveranrop och inloggningslänkar pekar på dejz.se i appen |
| App-ikon 1024 × 1024 utan genomskinlighet | ✅ `resources/icon.png` (riktiga loggan på lila) |
| Startskärm | ✅ `resources/splash.png` och `resources/splash-dark.png` |
| Capacitor (gör om webbappen till iPhone-app) | ✅ Installerat och inställt (`capacitor.config.ts`) |
| Säkra zoner för notch och hemknapp | ✅ Appen använder `safe-area` överallt |

---

## 📋 Det du behöver göra

### Steg 1 – Apple Developer Program
1. Gå till https://developer.apple.com/programs/ och gå med (99 USD per år).
2. **Viktigt:** Apple vill att appar för ekonomi skickas in av ett **företag**, inte av en privatperson. Med ett aktiebolag behöver du ett D-U-N-S-nummer (gratis, tar ca 1–2 veckor) och registrerar dig som *Organization*. Det är samma aktiebolag som behövs för bankkopplingen.

### Steg 2 – En Mac med Xcode
Appen byggs på en Mac. Installera **Xcode** från App Store (gratis).

### Steg 3 – Bygg iPhone-appen (på Macen, i projektmappen)
```
npm install
npx cap add ios
npm run ios:assets
npm run ios:build
npm run ios:open
```
Xcode öppnas. Välj ditt team under *Signing & Capabilities* och tryck på ▶ för att testa i simulatorn eller i din iPhone.

### Steg 4 – Slå på "Fortsätt med Apple"
1. I Apple Developer: skapa en *Services ID* och en *Key* för Sign in with Apple.
2. I Supabase: *Authentication → Providers → Apple* → slå på och fyll i uppgifterna.
3. I Vercel: *Settings → Environment Variables* → lägg till `VITE_ENABLE_APPLE_SIGNIN` = `true` och publicera om.

### Steg 5 – Inloggning med Google och Apple inne i appen
Google tillåter inte inloggning i inbäddade webbvyer. När iPhone-appen finns kopplar jag in systemets inloggningsfönster (Capacitor Browser + en egen länk `se.dejz.app://`). Säg till när du är på steg 3, så gör jag det.

### Steg 6 – App Store Connect (https://appstoreconnect.apple.com)
- **Namn:** Dejz – Kvar till lön
- **Underrubrik:** Se vad du har kvar till nästa lön
- **Kategori:** Finans
- **Åldersgräns:** 4+
- **Integritetspolicy:** https://dejz.se/integritet
- **Support:** https://dejz.se/support
- **Bundle ID:** `se.dejz.app`
- **Kryptering:** appen använder bara vanlig HTTPS → svara *Nej* på frågan om egen kryptering.

### Steg 7 – Appens integritet ("näringsdeklarationen")
Svara så här i App Store Connect → *App Privacy*:

| Data | Används till | Kopplad till dig | Spårning |
|---|---|---|---|
| E-post och namn | Appens funktion, konto | Ja | Nej |
| Ekonomisk info du lägger in (lön, räkningar, köp) | Appens funktion | Ja | Nej |
| Användar-id | Appens funktion | Ja | Nej |
| Hur appen används (senast aktiv, antal besök) | Analys | Ja | Nej |
| Kraschrapporter | Felsökning | Ja | Nej |
| Var du hittade Dejz (t.ex. "tiktok") | Analys | Ja | Nej |

Dejz spårar **inte** användare mellan appar, så ingen "App Tracking Transparency"-ruta behövs.

### Steg 8 – Testkonto till Apples granskare
Skapa ett konto med påhittad data (lön, några räkningar och köp) och skriv in e-post och lösenord under *App Review Information*. Utan det nekas appen.

### Steg 9 – Skärmbilder
Krävs för 6,9-tumsskärm (1320 × 2868). Säg till så tar jag dem från demoläget med "Elin".

---

## ⚠️ Saker att inte lova i App Store-texten
- **Bankkoppling** – skriv inte att den finns förrän den är på för alla.
- **Betalning** – säljer du något i appen senare (t.ex. Dejz Plus) måste det gå via Apples köp i appen.
