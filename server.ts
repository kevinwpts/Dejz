/**
 * Lokal utvecklingsserver (`npm run dev`, http://localhost:3000).
 *
 * Kör appen via Vite och serverfunktionerna i mappen `api/` – exakt samma filer som Vercel kör
 * på dejz.se. Det som fungerar här fungerar alltså också live, och tvärtom
 * (proffsen kallar det "dev/prod parity").
 *
 * Nycklar läses från .env / .env.local (samma namn som i Vercel).
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { createServer as createViteServer, loadEnv } from 'vite';

const root = path.resolve();
const PORT = Number(process.env.PORT) || 3000;

// Nycklar till serverfunktionerna (t.ex. GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY)
Object.assign(process.env, { ...loadEnv('development', root, ''), ...process.env });

type VercelHandler = (req: express.Request, res: express.Response) => unknown;

/** /api/ai/clean-merchants → api/ai/clean-merchants.ts (samma regel som Vercel) */
function resolveApiFile(urlPath: string): string | null {
  const rel = urlPath.replace(/^\/api\//, '').replace(/\/+$/, '');
  if (!rel || rel.includes('..')) return null;
  const file = path.join(root, 'api', `${rel}.ts`);
  return fs.existsSync(file) ? file : null;
}

async function start() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });

  app.all('/api/*', async (req, res) => {
    const file = resolveApiFile(req.path);
    if (!file) {
      res.status(404).json({ error: `Finns inte på dejz.se: ${req.path}` });
      return;
    }
    try {
      // Laddas om vid varje anrop så att ändringar i api/ syns direkt
      const mod = (await vite.ssrLoadModule(pathToFileURL(file).href)) as { default?: VercelHandler };
      if (typeof mod.default !== 'function') throw new Error('Saknar default-export');
      await mod.default(req, res);
    } catch (err) {
      console.error(`[api] ${req.path}:`, err);
      if (!res.headersSent) res.status(500).json({ error: 'Internt fel' });
    }
  });

  app.use(vite.middlewares);

  app.listen(PORT, () => {
    console.log(`Dejz körs på http://localhost:${PORT}`);
  });
}

void start();
