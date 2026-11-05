# Instruktioner för Claude – Dejz

## Om mig (Kevin)
- Jag är inte programmerare. Svara på **svenska**, enkelt och utan facktermer. Förklara vad du gör och varför, kort.
- När jag ber om att ta "ett steg i taget": ge bara nästa steg, inte hela planen.
- När jag frågar något och skriver "svara bara": svara, ändra ingenting.
- Ge en tydlig rekommendation i stället för en lång lista med alternativ.

## Om Dejz
- Budgetapp som visar **vad du har kvar till nästa lön**. Räknar från lön till lön, inte per kalendermånad. Räkningar och sparande dras av automatiskt.
- Slogan: **"Äntligen vet du vad du har kvar."**
- Status: väntelista på dejz.se. Bankkoppling (Enable Banking) kräver aktiebolag och är bara på för admin – lova aldrig att den finns för användare nu. Skriv "väntelista" eller "kommer snart".
- Målgrupp: unga vuxna i Sverige (ca 20–35) som lever från lön till lön.
- Appen ska vara **enkel**. Hemkortet är viktigast: belopp, "X dagar till lön", "X kr per dag", batteristapel (pengar kvar), inkomst/fasta/rörligt. Lägg inte till mer information där utan att fråga.

## Så jobbar vi
- Testa ändringar lokalt (`npm run dev`, http://localhost:3000) och visa resultatet innan något publiceras.
- **Pusha bara när jag säger "pusha".** Vercel publicerar automatiskt från `main`; kontrollera efteråt att ändringen syns på dejz.se.
- Uppdatera skärmbilderna på startsidan (`public/screens/*.png` + `.webp`) när hemskärmen ändras, och höj `?v=N` i `src/components/WaitlistLanding.tsx`.
- Projektet har gamla TypeScript-fel (t.ex. i `HomeTab.tsx`, `App.tsx`, `demoData.ts`). Rör dem inte i förbifarten – se bara till att du inte lägger till nya.

## Supabase och data – var försiktig
- Projekt-id: `smddiufwpdpmzhvideto`. Supabase är kopplat till Claude.
- **Läsa** får du göra fritt. **Fråga innan** du ändrar eller raderar data, kör SQL som ändrar något eller publicerar funktioner – om jag inte redan bett om just det.
- Ändra aldrig mina inställningar eller min data när du testar. Demoläget (`?demo`, bara lokalt) är isolerat från riktiga inloggningar och får aldrig synka till Supabase – behåll det så.
- API-nycklar och lösenord skriver du aldrig in åt mig – visa var jag lägger in dem.

## Bilder och video
- Använd alltid den **riktiga loggan**: `public/dejz_mork.png` (vit på lila, lila på ljust). Inte den omritade `DejzLogo`-vektorn eller `favicon.png`.
- Färger: lila gradient `#7356FF → #5B3DF5 → #3F22C9`, ljus bakgrund `#F5F4FA`. Typsnitt: Inter.
- Appbilder tas från demoläget (påhittad användare "Elin", klockan satt till 18:30). Visa aldrig mina riktiga siffror.
- Format och säkra zoner:
  - **TikTok/Reels/Stories:** 1080 × 1920. Inget viktigt de översta ~260 px eller närmast högerkanten (~150 px).
  - **Instagram/Facebook-flödet:** 1080 × 1350.
  - **Facebook-omslag:** 1640 × 624. Håll nedre mitten fri (profilbilden) och allt viktigt i mitten (mobilen beskär sidorna).
- Rendera till en tillfällig mapp och kopiera sedan in – filerna kan vara öppna i bildvisaren.
- Källfiler: `marketing/*.html`. Färdiga bilder: `marketing/social`, `marketing/test`, `marketing/tiktok`, `marketing/tiktok2`. Video: `marketing/video`.
- Ingen upphovsrättsskyddad musik. Gör egna ljud, eller låt mig välja musik i TikTok.
- Ingen falsk kundrecension (t.ex. AI-person som säger att den använt appen). AI-innehåll ska märkas som AI.

## Marknadsföring
- Spårlänkar: `dejz.se/?utm_source=tiktok|instagram|facebook|meta|van`.
- Väntelistan sparar e-post, var personen hittade Dejz, vad som är svårast och `utm_source`. Inget könummer visas.
