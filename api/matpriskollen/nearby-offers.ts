const mpkNearbyCache = new Map<string, { ts: number; payload: any }>();

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const lat = Number(req.query?.lat) || 56.0465;
    const lon = Number(req.query?.lon) || 12.6945;
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = mpkNearbyCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
      return res.status(200).json(cached.payload);
    }

    const storesRes = await fetch(
      `https://matpriskollen.se/api/v1/stores?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=25`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        },
      }
    );

    if (!storesRes.ok) {
      return res.status(200).json({ storeCount: 0, offers: [] });
    }

    const rawStores = await storesRes.json();
    const validStores = (Array.isArray(rawStores) ? rawStores : [])
      .filter((s: any) => s && s.key && Number(s.offerCount) > 0)
      .slice(0, 12);

    const perStoreOffers = await Promise.all(
      validStores.map(async (st: any) => {
        try {
          const r = await fetch(
            `https://matpriskollen.se/api/v1/stores/${encodeURIComponent(st.key)}/offers?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=120`,
            {
              headers: {
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
              },
            }
          );
          if (!r.ok) return [];
          const d = await r.json();
          const arr = Array.isArray(d?.offers) ? d.offers : [];
          return arr.map((o: any) => ({
            ...o,
            storeKey: String(st.key),
            storeName: String(st.name || ''),
            chainName: String(st.chainName || ''),
            storeLogo: st.imageUrl || undefined,
            storeDist: st.dist ? String(st.dist) : undefined,
            storeLat: Number(st.lat),
            storeLon: Number(st.lon),
          }));
        } catch {
          return [];
        }
      })
    );

    const payload = {
      storeCount: validStores.length,
      offers: perStoreOffers.flat(),
    };
    mpkNearbyCache.set(cacheKey, { ts: Date.now(), payload });
    return res.status(200).json(payload);
  } catch (e) {
    console.error('[Matpriskollen] nearby-offers error:', e);
    return res.status(200).json({ storeCount: 0, offers: [] });
  }
}
