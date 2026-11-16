// Vercel kör api/ som Node-ESM: lokala importer måste sluta på .js, annars kraschar ALLA
// serverfunktioner på dejz.se (FUNCTION_INVOCATION_FAILED) – fast allt fungerar lokalt och i testerna.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
  });

describe('api/: lokala importer', () => {
  it.each(files('api'))('%s har .js på alla lokala importer', (file) => {
    const imports = [...readFileSync(file, 'utf8').matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => m[1]);
    expect(imports.filter((spec) => !spec.endsWith('.js'))).toEqual([]);
  });
});
