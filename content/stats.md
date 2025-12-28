---
title: "Statistiques"
---

<h1>Statistiques des pages vues</h1>

<div id="summary" style="margin-bottom:20px; font-size:1.2em;">
  Chargement…
</div>

<label>
  Filtrer par page :
  <select id="filter"></select>
</label>

<div id="stats" style="margin-top:20px;">Chargement…</div>

<h2>Graphique des vues par jour</h2>
<canvas id="chart" width="800" height="300"></canvas>

<script>
fetch("/.netlify/functions/get-stats")
  .then(r => r.json())
  .then(rows => {
    const statsDiv = document.getElementById("stats");
    const filter = document.getElementById("filter");
    const summary = document.getElementById("summary");

    if (!rows.length) {
      statsDiv.innerHTML = "<p>Aucune donnée.</p>";
      return;
    }

    // --- Résumé global ---
    const totalViews = rows.reduce((sum, r) => sum + r.count, 0);
    summary.innerHTML = `<strong>Total de vues :</strong> ${totalViews}`;

    // --- Liste des pages pour le filtre ---
    const pages = [...new Set(rows.map(r => r.path))];
    filter.innerHTML = `<option value="">Toutes</option>` +
      pages.map(p => `<option value="${p}">${p}</option>`).join("");

    // --- Fonction d'affichage du tableau ---
    function renderTable() {
      const selected = filter.value;
      const filtered = selected ? rows.filter(r => r.path === selected) : rows;

      let html = `
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="border-bottom: 1px solid #ccc; text-align:left;">Date</th>
              <th style="border-bottom: 1px solid #ccc; text-align:left;">Page</th>
              <th style="border-bottom: 1px solid #ccc; text-align:right;">Vues</th>
            </tr>
          </thead>
          <tbody>
      `;

      filtered.forEach(row => {
        html += `
          <tr>
            <td>${row.date}</td>
            <td>${row.path}</td>
            <td style="text-align:right;">${row.count}</td>
          </tr>
        `;
      });

      html += "</tbody></table>";
      statsDiv.innerHTML = html;
    }

    filter.addEventListener("change", renderTable);
    renderTable();

    // --- Graphique des vues par jour ---
    const byDate = {};
    rows.forEach(r => {
      byDate[r.date] = (byDate[r.date] || 0) + r.count;
    });

    const labels = Object.keys(byDate);
    const values = Object.values(byDate);

    const ctx = document.getElementById("chart").getContext("2d");

    // Graphique artisanal sans dépendances
    function drawChart() {
      const max = Math.max(...values);
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      const barWidth = w / labels.length;

      ctx.clearRect(0, 0, w, h);

      values.forEach((v, i) => {
        const barHeight = (v / max) * (h - 20);
        ctx.fillStyle = "#4a90e2";
        ctx.fillRect(i * barWidth, h - barHeight, barWidth - 4, barHeight);

        ctx.fillStyle = "#000";
        ctx.font = "10px sans-serif";
        ctx.fillText(labels[i], i * barWidth + 2, h - 5);
      });
    }

    drawChart();
  })
  .catch(err => {
    document.getElementById("stats").innerHTML =
      "<p>Erreur lors du chargement des statistiques.</p>";
    console.error(err);
  });
</script>
