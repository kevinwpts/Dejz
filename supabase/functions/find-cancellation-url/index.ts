import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabaseUserVerifier } from '../_shared/auth.ts';
import { createHandler } from './handler.ts';

const env = (name: string) => Deno.env.get(name);
serve(createHandler({ env, getUserId: supabaseUserVerifier(env) }));
