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
    summary.innerHTML = `<strong>Total de vues :</strong> ${totalViews}`;

    // --- TABLEAU CROISÉ UNIQUE ---
    function renderPivotTable() {
      // 1. Dates triées (récentes → anciennes)
      const dates = [...new Set(rows.map(r => r.date))]
        .sort((a, b) => new Date(b) - new Date(a));

      // 2. Pages triées alphabétiquement
      const pages = [...new Set(rows.map(r => r.path))].sort();

      // 3. Construction d’un index {page → {date → count}}
      const matrix = {};
      pages.forEach(p => matrix[p] = {});
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
      let html = `
        <style>
          .pivot-table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 20px;
          }
          .pivot-table th, .pivot-table td {
            border: 1px solid #ccc;
            padding: 4px;
            text-align: right;
            font-size: 0.9em;
          }
          .pivot-table th.label {
            background: #eee;
            text-align: left;
          }
          .pivot-table th.date {
            background: #eee;
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            text-align: left;
            height: 120px;
            vertical-align: bottom;
            padding: 2px;
          }
          .pivot-table tfoot td {
            font-weight: bold;
            background: #f7f7f7;
          }
        </style>

        <table class="pivot-table">
          <thead>
            <tr>
              <th class="label">Page</th>
              ${dates.map(d => {
                const [y, m, day] = d.split("-");
                return `<th class="date">${day}/${m}/${y}</th>`;
              }).join("")}
              <th class="label">Total</th>
            </tr>
          </thead>
          <tbody>
      `;

      pages.forEach(p => {
        html += `
          <tr>
            <th class="label">${p}</th>
            ${dates.map(d => `<td>${matrix[p][d] || ""}</td>`).join("")}
            <td><strong>${totalByPage[p]}</strong></td>
          </tr>
        `;
      });

      html += `
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              ${dates.map(d => `<td><strong>${totalByDate[d]}</strong></td>`).join("")}
              <td><strong>${grandTotal}</strong></td>
            </tr>
          </tfoot>
        </table>
      `;

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
