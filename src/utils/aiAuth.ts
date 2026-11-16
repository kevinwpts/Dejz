// dejz.se:s AI-funktioner (/api/ai/...) kräver inloggning, så att ingen utomstående kan
// använda vår Gemini-nyckel. Här hämtas inloggningen som ska skickas med.
import { supabase } from '../supabaseClient';

/** Rubriker till ett AI-anrop, eller null om ingen är inloggad (då hoppar vi över AI:n). */
export async function aiRequestHeaders(): Promise<Record<string, string> | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null;
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  } catch {
    return null;
  }
}
