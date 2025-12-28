---
title: "Statistiques"
---

<div id="stats">Chargement…</div>

<script>
fetch("/.netlify/functions/get-stats")
  .then(r => r.json())
  .then(rows => {
    const container = document.getElementById("stats");

    if (!rows.length) {
      container.innerHTML = "<p>Aucune donnée.</p>";
      return;
    }

    let html = `
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th style="border-bottom: 1px solid #ccc; text-align:left;">Date</th>
            <th style="border-bottom: 1px solid #ccc; text-align:left;">Path</th>
            <th style="border-bottom: 1px solid #ccc; text-align:right;">Count</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach(row => {
      html += `
        <tr>
          <td>${row.date}</td>
          <td>${row.path}</td>
          <td style="text-align:right;">${row.count}</td>
        </tr>
      `;
    });

    html += "</tbody></table>";

    container.innerHTML = html;
  })
  .catch(err => {
    document.getElementById("stats").innerHTML =
      "<p>Erreur lors du chargement des statistiques.</p>";
    console.error(err);
  });
</script>
