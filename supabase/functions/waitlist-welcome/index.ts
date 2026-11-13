// Skickar ett tackmejl till den som just skrivit upp sig på väntelistan.
//
// Säkerhet: funktionen skickar bara till adresser som redan finns i väntelistan,
// som skrevs upp de senaste 30 minuterna och som inte redan fått mejlet.
// Varje adress kan alltså få högst ett mejl, och ingen kan använda funktionen
// för att skicka mejl till vem som helst.
//
// Hemligheter som behövs (Supabase -> Edge Functions -> Secrets):
//   RESEND_API_KEY   – API-nyckel från resend.com
//   WAITLIST_FROM    – valfri, t.ex. "Dejz <hej@dejz.se>" (domänen måste vara verifierad i Resend)
// SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY finns automatiskt.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import type { CreateClient } from '../_shared/deps.ts';
import { createHandler } from './handler.ts';

serve(createHandler({ env: (name) => Deno.env.get(name), createClient: createClient as unknown as CreateClient }));
