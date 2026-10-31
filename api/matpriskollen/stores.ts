export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const lat = Number(req.query?.lat) || 56.0465;
    const lon = Number(req.query?.lon) || 12.6945;
    const limit = Math.min(40, Math.max(1, Number(req.query?.limit) || 25));

    const upstream = await fetch(
      `https://matpriskollen.se/api/v1/stores?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=${limit}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        },
      }
    );

    if (!upstream.ok) {
      return res.status(upstream.status).json([]);
    }

    const data = await upstream.json();
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('[Matpriskollen] stores error:', e);
    return res.status(200).json([]);
  }
}
