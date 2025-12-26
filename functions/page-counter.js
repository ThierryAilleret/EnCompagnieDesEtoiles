export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const { path, date } = JSON.parse(event.body || "{}");

  if (!path || !date) {
    return {
      statusCode: 400,
      body: "Missing path or date"
    };
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const filePath = "data/page-views.json";

  const apiBase = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  // 1) Lire le fichier actuel
  const currentFile = await fetch(apiBase, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  const content = Buffer.from(currentFile.content, "base64").toString("utf8");
  const data = JSON.parse(content || "{}");

  // 2) Mettre à jour le compteur
  if (!data[date]) data[date] = {};
  if (!data[date][path]) data[date][path] = 0;

  data[date][path] += 1;

  // 3) Réécrire le fichier dans GitHub
  const newContent = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

  await fetch(apiBase, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Update page views for ${path} on ${date}`,
      content: newContent,
      sha: currentFile.sha
    })
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      path,
      date,
      count: data[date][path]
    })
  };
}
