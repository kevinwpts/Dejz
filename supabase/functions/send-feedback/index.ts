// Tar emot feedback och kraschrapporter från appen.
// 1) Sparar i tabellen public.feedback  2) Mejlar en kopia till FEEDBACK_TO (standard hej@dejz.se)
//
// Hemligheter (Supabase -> Edge Functions -> Secrets):
//   RESEND_API_KEY  – samma nyckel som tackmejlet (om den saknas sparas feedbacken ändå)
//   FEEDBACK_TO     – valfri, vart mejlet ska (standard hej@dejz.se)
//   WAITLIST_FROM   – valfri avsändare, t.ex. "Dejz <hej@dejz.se>"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import type { CreateClient } from '../_shared/deps.ts';
import { createHandler } from './handler.ts';

serve(createHandler({ env: (name) => Deno.env.get(name), createClient: createClient as unknown as CreateClient }));
