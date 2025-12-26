import { getStore } from '@netlify/blobs';

export async function handler(event) {
  // On n'accepte que POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const { path, date } = JSON.parse(event.body || '{}');

    if (!path || !date) {
      return {
        statusCode: 400,
        body: 'Missing "path" or "date"',
      };
    }

    // 1. Récupérer le store "page-views"
    const store = getStore({
      name: 'page-views',
      access: 'read_write', // lecture + écriture
    });

    const key = `${date}.json`;

    // 2. Lire le JSON existant pour ce jour
    let data = await store.get(key, { type: 'json' });
    if (!data) {
      data = {};
    }

    // 3. Incrémenter le compteur pour cette page
    const current = data[path] || 0;
    const updated = current + 1;
    data[path] = updated;

    // 4. Réécrire le JSON dans le blob
    await store.setJSON(key, data);

    // 5. Retourner l’info
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // petite protection CORS minimale si tu veux aussi interroger depuis d'autres origines
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ path, date, count: updated }),
    };
  } catch (error) {
    console.error('Error in page-counter:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
}
