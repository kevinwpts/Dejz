import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createHandler } from './handler.ts';

serve(createHandler({ env: (name) => Deno.env.get(name) }));
