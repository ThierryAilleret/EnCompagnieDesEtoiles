---
title: "Statistiques des pages vues"
---

<div id="summary" style="margin-bottom:20px; font-size:1.2em;">
  Chargement…
</div>

<h2>Tableau croisé</h2>
<div id="stats" style="margin-top:20px;">Chargement…</div>

<h2>Graphique des vues par jour</h2>
<canvas id="chart" width="800" height="300" style="border:1px solid #ccc;"></canvas>

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

<script>
fetch("/.netlify/functions/get-stats")
  .then(function(r) { return r.json(); })
  .then(function(rows) {

    var statsDiv = document.getElementById("stats");
    var summary = document.getElementById("summary");

    if (!rows.length) {
      statsDiv.innerHTML = "<p>Aucune donnée.</p>";
      return;
    }

    // Résumé global
    var totalViews = rows.reduce(function(sum, r) { return sum + r.count; }, 0);
    summary.innerHTML = "<strong>Total de vues :</strong> " + totalViews;

    // TABLEAU CROISÉ
    function renderPivotTable(rows) {

      // Dates triées (récentes → anciennes)
      var dates = Array.from(new Set(rows.map(function(r){ return r.date; })))
        .sort(function(a,b){ return new Date(b) - new Date(a); });

      // Pages triées
      var pages = Array.from(new Set(rows.map(function(r){ return r.path; })))
        .sort();

      // Index {page → {date → count}}
      var matrix = {};
      pages.forEach(function(p){ matrix[p] = {}; });
      rows.forEach(function(r){ matrix[r.path][r.date] = r.count; });

      // Totaux
      var totalByPage = {};
      pages.forEach(function(p){
        totalByPage[p] = dates.reduce(function(sum,d){
          return sum + (matrix[p][d] || 0);
        }, 0);
      });

      var totalByDate = {};
      dates.forEach(function(d){
        totalByDate[d] = rows
          .filter(function(r){ return r.date === d; })
          .reduce(function(sum,r){ return sum + r.count; }, 0);
      });

      var grandTotal = Object.values(totalByPage).reduce(function(a,b){ return a+b; }, 0);

      // Construction HTML
      var html = "";
      html += '<table class="pivot-table">';
      html += "<thead><tr>";
      html += '<th class="label">Page</th>';

      dates.forEach(function(d){
        var parts = d.split("-");
        var y = parts[0], m = parts[1], day = parts[2];
        html += '<th class="date">' + day + "/" + m + "/" + y + "</th>";
      });

      html += '<th class="label">Total</th>';
      html += "</tr></thead><tbody>";

      pages.forEach(function(p){
        html += "<tr>";
        html += '<th class="label">' + p + "</th>";

        dates.forEach(function(d){
          var v = matrix[p][d] || "";
          html += "<td>" + v + "</td>";
        });

        html += "<td><strong>" + totalByPage[p] + "</strong></td>";
        html += "</tr>";
      });

      html += "</tbody><tfoot><tr>";
      html += "<td><strong>Total</strong></td>";

      dates.forEach(function(d){
        html += "<td><strong>" + totalByDate[d] + "</strong></td>";
      });

      html += "<td><strong>" + grandTotal + "</strong></td>";
      html += "</tr></tfoot></table>";

      statsDiv.innerHTML = html;
    }

    renderPivotTable(rows);

    // GRAPHIQUE
    var byDate = {};
    rows.forEach(function(r){
      byDate[r.date] = (byDate[r.date] || 0) + r.count;
    });

    var labels = Object.keys(byDate);
    var values = Object.values(byDate);

    var ctx = document.getElementById("chart").getContext("2d");

		function drawChart() {
			if (!values.length) return;

			var max = Math.max.apply(null, values);
			var w = ctx.canvas.width;
			var h = ctx.canvas.height;
			var barWidth = w / labels.length;

			ctx.clearRect(0, 0, w, h);

			values.forEach(function(v, i){
				var barHeight = (v / max) * (h - 40); // on laisse plus de place en bas
				var x = i * barWidth;
				var y = h - barHeight - 20; // on remonte la barre pour laisser la place aux dates

				// Barre
				ctx.fillStyle = "#4a90e2";
				ctx.fillRect(x, y, barWidth - 4, barHeight);

				// Valeur au-dessus de la barre
				ctx.fillStyle = "#000";
				ctx.font = "12px sans-serif";
				ctx.textAlign = "center";
				ctx.fillText(v, x + (barWidth - 4) / 2, y - 4);

				// Date sous la barre
				ctx.fillStyle = "#000";
				ctx.font = "10px sans-serif";
				ctx.textAlign = "center";
				ctx.fillText(labels[i], x + (barWidth - 4) / 2, h - 5);
			});
		}


    drawChart();

  })
  .catch(function(err){
    document.getElementById("stats").innerHTML =
      "<p>Erreur lors du chargement des statistiques.</p>";
    console.error(err);
  });
</script>
