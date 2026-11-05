# Dejz

Dejz visar hur mycket du har kvar att spendera fram till nästa lön. Många lever från lön till lön – Dejz räknar i löneperioder, inte kalendermånader, och drar av räkningar och sparande automatiskt så att du ser vad som faktiskt är ditt.

## Funktioner
- **Kvar att spendera:** ett tydligt belopp för hela löneperioden, från lönedag till lönedag (med helganpassning).
- **Fasta räkningar och sparande** räknas av automatiskt varje period.
- **Logga köp på sekunder** med text eller röst – Dejz hittar butik, logga och kategori.
- **Analys och sparmål** per löneperiod.
- Bankkoppling (Enable Banking) finns, men är tills vidare endast aktiverad för admin.

## Demoläge (endast lokalt)
Öppna `http://localhost:3000/?demo` under `npm run dev` för att se appen med påhittad demodata, till exempel för skärmbilder. Demoläget finns inte i produktionsbygget.

## Installation för utvecklare
1. Klona projektet.
2. Installera beroenden: `npm install`
3. Konfigurera miljövariabler i `.env.local` (se `.env.example`).
4. Starta utvecklingsservern: `npm run dev`

## Licens
Apache-2.0

## Väntelistan – inställningar en gång
1. **Databas:** Kör `supabase/migrations/20261105_waitlist.sql` och sedan `20261106_waitlist_protection.sql` i Supabase (SQL Editor → New query → klistra in → Run).
2. **Stäng nya konton:** Supabase → Authentication → Sign In / Providers → stäng av *Allow new users to sign up*. Befintliga konton kan fortfarande logga in, även med Google.
3. **Tackmejl:**
   - Skapa ett konto på resend.com, lägg till och verifiera domänen `dejz.se` och skapa en API-nyckel.
   - Supabase → Edge Functions → Secrets: lägg till `RESEND_API_KEY` och eventuellt `WAITLIST_FROM` (t.ex. `Dejz <hej@dejz.se>`).
   - Publicera funktionen: `supabase functions deploy waitlist-welcome`.
4. **Testa:** Skriv upp dig på dejz.se, kolla att raden finns i tabellen `waitlist` och att tackmejlet kommer fram.

När appen ska öppna för alla: sätt `SIGNUPS_OPEN = true` i `src/components/modals/AuthModal.tsx` och slå på *Allow new users to sign up* igen.
