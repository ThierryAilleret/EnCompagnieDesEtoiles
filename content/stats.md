---
title: "Statistiques"
---

<h1>Statistiques des pages vues</h1>

<div id="summary" style="margin-bottom:20px; font-size:1.2em;">
  Chargement…
</div>

<h2>Tableau croisé</h2>
<div id="stats" style="margin-top:20px;">Chargement…</div>

<h2>Graphique des vues par jour</h2>
<canvas id="chart" width="800" height="300" style="border:1px solid #ccc;"></canvas>

<script>
fetch("/.netlify/functions/get-stats")
  .then(r => r.json())
  .then(rows => {
    const statsDiv = document.getElementById("stats");
    const summary = document.getElementById("summary");

    if (!rows.length) {
      statsDiv.innerHTML = "<p>Aucune donnée.</p>";
      return;
    }

    // --- Résumé global ---
    const totalViews = rows.reduce((sum, r) => sum + r.count, 0);
    summary.innerHTML = "<strong>Total de vues :</strong> " + totalViews;

    // --- TABLEAU CROISÉ UNIQUE ---
    function renderPivotTable() {
      // 1. Dates triées (récentes → anciennes)
      const dates = [...new Set(rows.map(r => r.date))]
        .sort((a, b) => new Date(b) - new Date(a));

      // 2. Pages triées alphabétiquement
      const pages = [...new Set(rows.map(r => r.path))].sort();

      // 3. Construction d’un index {page → {date → count}}
      const matrix = {};
      pages.forEach(p => { matrix[p] = {}; });
      rows.forEach(r => {
        matrix[r.path][r.date] = r.count;
      });

      // 4. Totaux par page et par date
      const totalByPage = {};
      pages.forEach(p => {
        totalByPage[p] = dates.reduce((sum, d) => sum + (matrix[p][d] || 0), 0);
      });

      const totalByDate = {};
      dates.forEach(d => {
        totalByDate[d] = rows
          .filter(r => r.date === d)
          .reduce((sum, r) => sum + r.count, 0);
      });

      const grandTotal = Object.values(totalByPage).reduce((a, b) => a + b, 0);

      // 5. Construction HTML
      let html = ""
        + "<style>"
        + "  .pivot-table {"
        + "    border-collapse: collapse;"
        + "    width: 100%;"
        + "    margin-top: 20px;"
        + "  }"
        + "  .pivot-table th, .pivot-table td {"
        + "    border: 1px solid #ccc;"
        + "    padding: 4px;"
        + "    text-align: right;"
        + "    font-size: 0.9em;"
        + "  }"
        + "  .pivot-table th.label {"
        + "    background: #eee;"
        + "    text-align: left;"
        + "  }"
        + "  .pivot-table th.date {"
        + "    background: #eee;"
        + "    writing-mode: vertical-rl;"
        + "    transform: rotate(180deg);"
        + "    text-align: left;"
        + "    height: 120px;"
        + "    vertical-align: bottom;"
        + "    padding: 2px;"
        + "  }"
        + "  .pivot-table tfoot td {"
        + "    font-weight: bold;"
        + "    background: #f7f7f7;"
        + "  }"
        + "</style>";

      html += '<table class="pivot-table">';
      html +=   "<thead>";
      html +=     "<tr>";
      html +=       '<th class="label">Page</th>';

      // En-têtes de dates, format dd/mm/yyyy, pivotées
      html += dates.map(function(d) {
        var parts = d.split("-");
        var y = parts[0], m = parts[1], day = parts[2];
        return '<th class="date">' + day + "/" + m + "/" + y + "</th>";
      }).join("");

      html +=       '<th class="label">Total</th>';
      html +=     "</tr>";
      html +=   "</thead>";
      html +=   "<tbody>";

      // Lignes par page
      pages.forEach(function(p) {
        html += "<tr>";
        html +=   '<th class="label">' + p + "</th>";
        html +=   dates.map(function(d) {
          var v = matrix[p][d] || "";
          return "<td>" + v + "</td>";
        }).join("");
        html +=   "<td><strong>" + totalByPage[p] + "</strong></td>";
        html += "</tr>";
      });

      html +=   "</tbody>";
      html +=   "<tfoot>";
      html +=     "<tr>";
      html +=       "<td><strong>Total</strong></td>";
      html +=       dates.map(function(d) {
        return "<td><strong>" + totalByDate[d] + "</strong></td>";
      }).join("");
      html +=       "<td><strong>" + grandTotal + "</strong></td>";
      html +=     "</tr>";
      html +=   "</tfoot>";
      html += "</table>";

      statsDiv.innerHTML = html;
    }

    renderPivotTable();

    // --- Graphique artisanal ---
    const byDate = {};
    rows.forEach(r => {
      byDate[r.date] = (byDate[r.date] || 0) + r.count;
    });

    const labels = Object.keys(byDate);
    const values = Object.values(byDate);

    const ctx = document.getElementById("chart").getContext("2d");

    function drawChart() {
      if (!values.length) return;
      const max = Math.max.apply(null, values);
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
