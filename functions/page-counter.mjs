import { getStore } from "@netlify/blobs";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const { path, date } = JSON.parse(event.body || "{}");

    if (!path || !date) {
      return {
        statusCode: 400,
        body: "Missing path or date",
      };
    }

    // ⚠️ NOUVELLE API : juste un nom de store, pas un objet
    const store = getStore("page-views");

    const key = `${date}.json`;

    let data = await store.get(key, { type: "json" });
    if (!data) data = {};

    const current = data[path] || 0;
    data[path] = current + 1;

    await store.set(key, JSON.stringify(data));

    return {
      statusCode: 200,
      body: JSON.stringify({ path, date, count: data[path] }),
    };
  } catch (err) {
    console.error("Error in page-counter:", err);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
}
