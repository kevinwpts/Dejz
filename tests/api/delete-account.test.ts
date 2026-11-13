// api/auth/delete-account.ts – raderar den inloggades konto och all data.
// Viktigast: bara den som är inloggad kan radera, och bara sitt eget konto.
import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase, hasStep, mockRes } from '../helpers';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

const { default: handler } = await import('../../api/auth/delete-account');

const ME = '11111111-1111-1111-1111-111111111111';
const SOMEONE_ELSE = '22222222-2222-2222-2222-222222222222';
const SERVICE_KEY = 'service-role-secret-key';

/** Tabeller i databasen som har användarens data: user_id-kolumn, plus profiles (id = användaren). */
function userTablesFromSchema(): string[] {
  const src = readFileSync(path.resolve(__dirname, '../../src/types/database.ts'), 'utf8');
  const tablesSection = src.slice(src.indexOf('    Tables: {'), src.indexOf('    Views: {'));
  const tables: string[] = [];
  const re = /^ {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/gm;
  for (const m of tablesSection.matchAll(re)) {
    if (/^ {10}user_id:/m.test(m[2]) || m[1] === 'profiles') tables.push(m[1]);
  }
  return tables;
}

let db: ReturnType<typeof fakeSupabase>;
let errors: ReturnType<typeof vi.spyOn>;

function loggedInAs(userId: string) {
  db.auth.getUser.mockImplementation(async (token?: string) =>
    token === 'good-token'
      ? { data: { user: { id: userId } }, error: null }
      : { data: { user: null }, error: { message: 'invalid JWT' } },
  );
}

const call = async (req: Parameters<typeof handler>[0]) => {
  const { res, out } = mockRes();
  await handler(req, res);
  return out;
};

const authed = (body: unknown, token = 'good-token') => ({
  method: 'POST',
  body,
  headers: { authorization: `Bearer ${token}` },
});

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY);
  db = fakeSupabase();
  createClient.mockReset().mockReturnValue(db);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('delete-account: metod och indata', () => {
  it.each(['GET', 'PUT', 'DELETE', undefined])('svarar 405 på %s och rör ingenting', async (method) => {
    const out = await call({ method, body: { userId: ME } });
    expect(out.statusCode).toBe(405);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('svarar 500 utan att avslöja något när serverns nycklar saknas', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const out = await call(authed({ userId: ME }));
    expect(out.statusCode).toBe(500);
    expect(out.body).toEqual({ error: 'Missing configuration' });
  });

  it('använder aldrig en VITE_-nyckel som serverns nyckel', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('VITE_SUPABASE_SERVICE_ROLE_KEY', 'public-key');
    const out = await call(authed({ userId: ME }));
    expect(out.statusCode).toBe(500);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('svarar 400 utan userId', async () => {
    const out = await call(authed({}));
    expect(out.statusCode).toBe(400);
    expect(db.from).not.toHaveBeenCalled();
  });

  it('läser userId även när kroppen kommer som text', async () => {
    loggedInAs(ME);
    const out = await call(authed(JSON.stringify({ userId: ME })));
    expect(out.statusCode).toBe(200);
  });
});

describe('delete-account: behörighet', () => {
  it('svarar 401 utan Authorization och raderar ingenting', async () => {
    const out = await call({ method: 'POST', body: { userId: ME }, headers: {} });
    expect(out.statusCode).toBe(401);
    expect(db.from).not.toHaveBeenCalled();
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('svarar 401 när token inte är "Bearer …"', async () => {
    const out = await call({ method: 'POST', body: { userId: ME }, headers: { authorization: 'good-token' } });
    expect(out.statusCode).toBe(401);
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('svarar 403 på ogiltig token och raderar ingenting', async () => {
    loggedInAs(ME);
    const out = await call(authed({ userId: ME }, 'forged-token'));
    expect(out.statusCode).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('svarar 403 när någon försöker radera någon annans konto', async () => {
    loggedInAs(ME);
    const out = await call(authed({ userId: SOMEONE_ELSE }));
    expect(out.statusCode).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('svarar 403 när auth svarar utan användare', async () => {
    db.auth.getUser.mockResolvedValue({ data: null, error: null });
    const out = await call(authed({ userId: ME }));
    expect(out.statusCode).toBe(403);
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('tar emot även "Authorization" med stort A', async () => {
    loggedInAs(ME);
    const out = await call({ method: 'POST', body: { userId: ME }, headers: { Authorization: 'Bearer good-token' } });
    expect(out.statusCode).toBe(200);
  });

  it('ignorerar andra id:n i kroppen (secondaryUserId, email) – raderar bara den inloggade', async () => {
    loggedInAs(ME);
    const out = await call(authed({ userId: ME, secondaryUserId: SOMEONE_ELSE, email: 'other@example.com' }));
    expect(out.statusCode).toBe(200);
    for (const c of db.calls) {
      const filters = c.chain.filter((s) => s[0] === 'eq');
      expect(filters).toEqual([['eq', c.table === 'profiles' ? 'id' : 'user_id', ME]]);
    }
    expect(db.auth.admin.deleteUser).toHaveBeenCalledTimes(1);
    expect(db.auth.admin.deleteUser).toHaveBeenCalledWith(ME);
  });
});

describe('delete-account: radering', () => {
  it('raderar från varje tabell med användardata, filtrerat på den inloggade', async () => {
    loggedInAs(ME);
    const out = await call(authed({ userId: ME }));
    expect(out.statusCode).toBe(200);
    expect(out.body).toEqual({ success: true });

    const deleted = db.calls.map((c) => c.table);
    // Alla tabeller i databastyperna som har en user_id-kolumn (+ profiles) ska städas
    const expected = userTablesFromSchema();
    expect(expected.length).toBeGreaterThan(15);
    expect([...deleted].sort()).toEqual([...expected].sort());

    for (const c of db.calls) {
      expect(hasStep(c, 'delete')).toBe(true);
      expect(hasStep(c, 'eq', c.table === 'profiles' ? 'id' : 'user_id', ME)).toBe(true);
    }
  });

  it('raderar i säker ordning: barn före föräldrar, profiles sist, auth-användaren allra sist', async () => {
    loggedInAs(ME);
    const order: string[] = [];
    db = fakeSupabase((c) => {
      order.push(c.table);
      return {};
    });
    createClient.mockReturnValue(db);
    loggedInAs(ME);
    db.auth.admin.deleteUser.mockImplementation(async () => {
      order.push('auth.users');
      return { error: null };
    });

    await call(authed({ userId: ME }));

    const before = (a: string, b: string) => expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
    before('bank_transactions', 'bank_accounts');
    before('bank_accounts', 'bank_connections');
    before('bank_provider_sessions', 'bank_connections');
    before('transactions', 'accounts');
    expect(order.at(-2)).toBe('profiles');
    expect(order.at(-1)).toBe('auth.users');
  });

  it('fortsätter vid fel i en tabell och raderar ändå auth-användaren (resten försvinner via cascade)', async () => {
    db = fakeSupabase((c) => (c.table === 'transactions' ? { error: { message: 'timeout' } } : {}));
    createClient.mockReturnValue(db);
    loggedInAs(ME);

    const out = await call(authed({ userId: ME }));
    expect(out.statusCode).toBe(200);
    expect(db.calls.map((c) => c.table)).toContain('profiles');
    expect(db.auth.admin.deleteUser).toHaveBeenCalledWith(ME);
    expect(errors).toHaveBeenCalledWith('Error deleting from transactions:', { message: 'timeout' });
  });

  it('svarar 500 om auth-användaren inte kunde raderas', async () => {
    loggedInAs(ME);
    db.auth.admin.deleteUser.mockResolvedValue({ error: { message: 'User not found' } });
    const out = await call(authed({ userId: ME }));
    expect(out.statusCode).toBe(500);
    expect(out.body).toEqual({ error: 'Kunde inte radera användarkontot helt: User not found' });
  });

  it('svarar 500 (utan serverns nyckel) om något kastar ett fel', async () => {
    loggedInAs(ME);
    db.from.mockImplementation(() => {
      throw new Error('connection refused');
    });
    const out = await call(authed({ userId: ME }));
    expect(out.statusCode).toBe(500);
    expect(out.body).toEqual({ error: 'connection refused' });
    expect(JSON.stringify(out.body)).not.toContain(SERVICE_KEY);
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('skapar klienten med serverns nyckel (inte användarens token)', async () => {
    loggedInAs(ME);
    await call(authed({ userId: ME }));
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', SERVICE_KEY);
    expect(db.auth.getUser).toHaveBeenCalledWith('good-token');
  });
});
