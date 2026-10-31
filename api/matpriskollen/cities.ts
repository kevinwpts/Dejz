export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const city = String(req.query?.city || '').trim();
    if (city.length < 2) {
      return res.status(200).json([]);
    }

    const upstream = await fetch(
      `https://matpriskollen.se/api/geo/local?city=${encodeURIComponent(city)}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        },
      }
    );

    if (!upstream.ok) {
      return res.status(200).json([]);
    }

    const data = await upstream.json();
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch {
    return res.status(200).json([]);
  }
}
