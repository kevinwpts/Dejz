// Egen e-postverifiering (Supabase "Confirm email" är avstängt så att folk kommer in direkt).
//   { action: 'send' }            – inloggad användare: skickar ett verifieringsmejl via Resend
//   { action: 'confirm', token }  – länken i mejlet: markerar e-posten som verifierad
//
// Hemligheter: RESEND_API_KEY (samma som tackmejlet), valfritt WAITLIST_FROM.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import type { CreateClient } from '../_shared/deps.ts';
import { createHandler } from './handler.ts';

serve(createHandler({ env: (name) => Deno.env.get(name), createClient: createClient as unknown as CreateClient }));
