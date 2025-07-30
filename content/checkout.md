+++  
title = "Finaliser ma commande"  
url    = "/checkout.html"  
layout = "checkout"  
+++
<!-- Pour Mondial Relay -->
<script src="//ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>
<script src="//unpkg.com/leaflet/dist/leaflet.js"></script>
<link rel="stylesheet" href="//unpkg.com/leaflet/dist/leaflet.css" />
<script src="//widget.mondialrelay.com/parcelshop-picker/jquery.plugin.mondialrelay.parcelshoppicker.min.js"></script>

<!-- Autocomplétion d'adresse via Geoportail -->
<script>
document.addEventListener("DOMContentLoaded", () => {

  const adresseInput = document.getElementById("adresse");
  const cpInput      = document.getElementById("code-postal");

  adresseInput.addEventListener("input", async e => {


    const q = e.target.value.trim();
    if (q.length < 3) return;

		const res = await fetch(`https://data.geopf.fr/geocodage/completion?text=${encodeURIComponent(q)}&limit=5&terr=METROPOLE`);

    const data = await res.json();
		//console.log("🔵 Suggestions reçues :", data);

    const cont = document.getElementById("autocomplete-container");
		cont.innerHTML = "";
		cont.style.display = "none";

		let count = 0;
		data.results?.forEach(item => {
			const div = document.createElement("div");
			div.className = "suggestion";
			div.textContent = item.fulltext || `${item.number} ${item.street} ${item.city}`;
			div.addEventListener("click", () => {
				adresseInput.value = div.textContent;
				remplirAdresseGeo(item);
				cont.innerHTML = "";
				cont.style.display = "none";
			});
			cont.appendChild(div);
			count++;
		});

		cont.style.display = count ? "block" : "none"

  });

	document.getElementById("bouton-relai").addEventListener("click", afficherPopupMondialRelay);

	//Affichage du contenu du panier
	afficherPanierDansCheckout();
});

window.addEventListener("panierMisAJour", () => {
  afficherPanierDansCheckout();
});

function afficherPanierDansCheckout() {
	const panierJSON = localStorage.getItem("panier");
	if (!panierJSON) return;

	let total = 0;
	const panier = JSON.parse(panierJSON);
	const ul = document.getElementById("panier-resume");

	ul.innerHTML = "";
	panier.forEach(article => {
		const li = document.createElement("li");
		li.innerHTML = `
			<div style="display:flex; gap:10px; margin-bottom:10px;">
				<img src="${article.image}" alt="${article.titre}" style="height:48px; width:auto; border-radius:4px;">
				<div>
					<strong>${article.titre}</strong><br>
					<span style="font-size:0.9em;">${article.description}</span><br>
					<span>${article.quantite} × ${article.prix}${article.monnaie}</span>
				</div>
			</div>
		`;
		ul.appendChild(li);
		total += article.prix * article.quantite;
	});

	document.getElementById("total-commande").innerHTML = `<strong>Total :</strong> ${total} €`;
  const totalPaiement = document.getElementById("prix-total");
  if (totalPaiement) {
    totalPaiement.innerHTML = `Total : ${total} €`;
  }
}

function afficherPopupMondialRelay() {
  const cp = localStorage.getItem('codePostal')?.trim() || "";
  const ville = localStorage.getItem('ville')?.trim() || "";

  if (!cp || !ville) {
    alert("Veuillez renseigner l'adresse avant.");
    return;
  }

  // Création de la pop-up
  const popup = document.createElement("div");
  popup.id = "popup-overlay";
  popup.style.cssText = `
    position:fixed; top:0; left:0; width:100vw; height:100vh;
    background:rgba(0,0,0,0.6); z-index:1000;
    display:flex; justify-content:center; align-items:center;
  `;

  const conteneur = document.createElement("div");
  conteneur.style.cssText = `
    background:#fff; padding:20px; width:90%; max-width:800px;
    max-height:90vh; overflow-y:auto; border-radius:6px;
  `;
	conteneur.style.position = "relative";

  // Création dynamique d’un widget frais
  const popupWidget = document.createElement("div");
  popupWidget.id = "popup-widget";
  popupWidget.style.display = "block";

  const zoneWidget = document.createElement("div");
  zoneWidget.id = "Zone_Widget";

  const inputHidden = document.createElement("input");
  inputHidden.type = "text";
  inputHidden.id = "Target_Widget";
  inputHidden.name = "point-relay";
  inputHidden.hidden = true;

  popupWidget.appendChild(zoneWidget);
  popupWidget.appendChild(inputHidden);
  conteneur.appendChild(popupWidget);

	// Bouton de fermeture
	const close = document.createElement("button");
	close.innerHTML = `
		<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
			<line x1="10" y1="10" x2="20" y2="20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="20" y1="10" x2="10" y2="20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
		</svg>
	`;
	close.style.cssText = `
		position: absolute;
		top: 12px;
		right: 12px;
		z-index: 1001;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: #d32f2f;
		border: none;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 3px 8px rgba(0,0,0,0.2);
		transition: transform 0.2s ease, background 0.3s;
	`;
	close.onmouseover = () => {
		close.style.transform = "scale(1.05)";
		close.style.background = "#b71c1c";
	};
	close.onmouseout = () => {
		close.style.transform = "scale(1)";
		close.style.background = "#d32f2f";
	};
	conteneur.appendChild(close);

	close.className = "bouton-fermer";

  close.onclick = () => {
    document.body.removeChild(popup);
  };
  conteneur.insertBefore(close, conteneur.firstChild);

  popup.appendChild(conteneur);
  document.body.appendChild(popup);

	// Fermeture si clic à l'extérieur du conteneur
	popup.addEventListener("click", function(e) {
		if (!conteneur.contains(e.target)) {
			close.click(); // Simule le clic sur le bouton croix
		}
	});

	// Fermeture avec Échap ou Entrée
	window.addEventListener("keydown", function(e) {
		if (e.key === "Escape" || e.key === "Enter") {
			close.click();
		}
	});


  // Initialisation du widget Mondial Relay
  $("#Zone_Widget").MR_ParcelShopPicker({
    Target: "#Target_Widget",
    Brand: "CC23JV2D",
    Country: "FR",
		AllowedCountries: "FR",
		Language: "FR",
		EnableGeolocalisatedSearch: "Yes",
    PostCode: cp,
    City: ville,
    NbResults: "10",
    ColLivMod: "24R",
    Responsive: true,
    ShowResultsOnMap: true,
    OnParcelShopSelected: function (data) {
      const zoneInfo = document.getElementById("relai-selectionne");
      const champ = document.getElementById("info-relai");
      if (!zoneInfo || !champ) return;

      const fullName = `<strong>${data.Nom}</strong><br>${data.Adresse1}, ${data.CP} ${data.Ville}`;
      let horaires = "";

      if (data.HoursHtmlTable) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.HoursHtmlTable, "text/html");
        const rows = doc.querySelectorAll("table tr");
        const horairesBruts = [];

        rows.forEach(row => {
          const jour = row.querySelector("th")?.textContent?.trim()?.slice(0, 3);
          const tds = row.querySelectorAll("td");
          const heures = Array.from(tds).map(td => td.textContent.trim()).filter(Boolean).join(" / ");
          if (jour) horairesBruts.push({ jour, horaires: heures || "-" });
        });

        const groupes = {};
        horairesBruts.forEach(({ jour, horaires }) => {
          if (!groupes[horaires]) groupes[horaires] = [];
          groupes[horaires].push(jour);
        });

        const joursFR = { Mon: "Lun", Tue: "Mar", Wed: "Mer", Thu: "Jeu", Fri: "Ven", Sat: "Sam", Sun: "Dim" };

        const lignes = Object.entries(groupes).map(([horaires, jours]) => {
          const trad = jours.map(j => joursFR[j] || j);
          const etiquette = trad.length === 1 ? trad[0] : `${trad[0]}–${trad[trad.length - 1]}`;
          return `<div id="horaires-relai"><strong>${etiquette}</strong> : ${horaires}</div>`;
        });

        horaires = lignes.join("");
      }

      const html = `
        <div class="carte-relai">
          <div class="entete-relai"><span class="icone-carte">📍</span><strong>${data.Nom}</strong></div>
          <div class="adresse-relai">${data.Adresse1}<br>${data.CP} ${data.Ville}</div>
          <div class="horaire-relai">
            <div class="horloge">🕒 Horaires :</div>
            <div class="table-horaire">${horaires}</div>
          </div>
        </div>
      `;

      champ.innerHTML = html;
      zoneInfo.style.display = "block";

      window._pointRelaisAdresse = `${data.Nom}, ${data.Adresse1}, ${data.CP} ${data.Ville}`;
      window._pointRelaisId = data.ID;
			
			// On passe à l'étape 3
			const etape3 = document.getElementById("step-3");
			etape3.classList.add("actif");
			
			const boutonPaiement = document.getElementById("checkout-button");
			boutonPaiement.classList.remove("bouton-verrouille");

    }
  });
}

function remplirAdresseGeo(item) {
  const cp    = item.zipcode || "";
  const ville = item.city || item.oldcity || "";
  const pays  = item.country || "";
  const adresse = item.fulltext || `${item.street}, ${cp} ${ville}`;

  // Préremplit le champ Adresse
  document.getElementById("adresse").value = adresse;

	// Stockage
	localStorage.setItem('codePostal', cp);
	localStorage.setItem('ville', ville);

  // Affiche ou masque les points relais
	const boutonrelai = document.getElementById("bouton-relai");
	boutonrelai.style.display = "inline-block";

  window.adresseGoogleValidee = true;
  surveillerEtape1();

}

function surveillerEtape1() {
  const nom     = document.getElementById("nom").value.trim();
  const prenom  = document.getElementById("prenom").value.trim();
  const adresse = document.getElementById("adresse").value.trim();

  const etape1 = document.getElementById("step-1");
  const etape2 = document.getElementById("step-2");

  const etape_1_complete = nom && prenom && adresse;

  if (etape_1_complete) {
    etape2.classList.add("actif");
  } else {
    etape2.classList.remove("actif");
  }
}

</script>

<div class="checkout-wrapper">
  <div class="checkout-left">
    <form id="checkout-form">
      <!-- Étape 1 : Facturation -->
      <fieldset id="step-1" class="etape actif">
        <legend><span class="etape-numero">1</span> Facturation</legend>
        <label>Nom :<br><input type="text" name="nom" id="nom" required /></label>
        <label>Prénom :<br><input type="text" name="prenom" id="prenom" required /></label>
				<div style="position:relative;">
					<label>Adresse :<br>
						<input type="text" id="adresse" name="adresse" autocomplete="off" required
									 placeholder="Saisissez une adresse" />
					</label>
					<div id="autocomplete-container"></div>
				</div>
        <label>Complément d'addresse :<br><input type="text" name="complement_adresse" /></label>
			</fieldset>
      <!-- Étape 2 : Livraison -->
      <fieldset id="step-2" class="etape">
        <legend><span class="etape-numero">2</span> Livraison</legend>
        <div id="livraison-section">
          <div id="bloc-ville-cp" style="display:none; margin-bottom:1em;">
              <input type="text" id="code-postal" name="code-postal" maxlength="5" style="display:none;">
              <input type="text" id="ville" name="ville"  style="display:none;">
          </div>
					<!-- Bouton pour lancer le widget -->
					<button type="button" id="bouton-relai" class="bouton-relai" style="display:none;">📍 Choisir un Point Relais</button>
					<!-- Zone d'affichage du point relais choisi -->
					<div id="relai-selectionne" style="display:none; margin-top:1em;">
						<p><strong>Relais sélectionné :</strong></p>
						<p id="info-relai"></p>
					</div>
        </div>
			</fieldset>
      <!-- Étape 3 : Paiement -->
      <fieldset id="step-3" class="etape">
        <legend><span class="etape-numero">3</span> Paiement</legend>
        <div id="recap-panier"></div>
        <p id="prix-total">Total : ... €</p>
				<button type="button" id="checkout-button" class="bouton-checkout  bouton-verrouille">
          Payer avec Stripe
        </button>
				<script src="https://js.stripe.com/v3/"></script>
      </fieldset>
    </form>
  </div>
	<!-- Résumé commande -->
	<div class="checkout-right">
		<h3>Résumé de la commande</h3>
		<ul id="panier-resume"></ul>
		<p id="total-commande"><strong>Total :</strong> ... €</p>
	</div>
</div>

<script>
document.getElementById("checkout-button").addEventListener("click", function (event) {
  event.preventDefault(); // Empêche la soumission du formulaire

  let panier = JSON.parse(localStorage.getItem("panier")) || [];

  // Normaliser la monnaie pour Stripe
  panier = panier.map(item => ({
    ...item,
    monnaie: item.monnaie === "€" ? "eur" : item.monnaie
  }));

  fetch("http://localhost:3000/creer-session-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ panier })
  })
  .then(response => {
    if (!response.ok) throw new Error("Réponse serveur non valide");
    return response.json();
  })
  .then(data => {
    if (!data.sessionId) throw new Error("Session Stripe non reçue");

    const stripe = Stripe("pk_test_51RkqVwGEPWcc8pKFZevbWerlrXRo1mIBwK9XfkO2eFBn9ulLVVXhpvozeHjDM7D3Xdu9hm3oUdTLhMO9UZfbPIYI00OmhDMt0o");
    stripe.redirectToCheckout({ sessionId: data.sessionId });
  })
  .catch(error => {
    console.error("💥 Erreur Stripe :", error);
    alert("Une erreur est survenue pendant la création du paiement. Vérifie ton panier et réessaie.");
  });
});

</script>


<style>
#autocomplete-container {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background-color: white;
  z-index: 1000;
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  max-height: 180px;
  overflow-y: auto;
  font-size: 0.9em;
}
#autocomplete-container:empty {
  display: none;
}

.suggestion {
  padding: 5px;
  cursor: pointer;
}
.suggestion:hover {
  background: #eee;
}

.checkout-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  margin-bottom: 40px;
}
.checkout-left {
  flex: 1;
  min-width: 300px;
}
.checkout-right {
  flex: 0 0 320px;
  background: #f9f9f9;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 2px;
}
.checkout-right h3 {
  margin-top: 0;
}
.checkout-right ul {
  list-style: none;
  padding: 0;
  margin-bottom: 10px;
}
.checkout-right li {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #ccc;
}
.checkout-right p {
  margin: 10px 0;
}
.logos-paiement img {
  height: 24px;
  margin-right: 10px;
  vertical-align: middle;
}

/* Étapes */
.etape {
  padding: 10px;
  margin-bottom: 20px;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.etape.actif {
  opacity: 1;
  pointer-events: auto;
	color: #000; /* Couleur texte normale */
}
.etape-numero {
  display: inline-block;
  width: 40px;
  height: 40px;
  line-height: 40px;
  margin-right: 1px;
  text-align: center;
  border-radius: 50%;
  background-color: #ddd;
	color: #666;
  font-weight: bold;
  font-size: 1em;
  position: relative;
  top: 0px; /* ajuste verticalement pour un meilleur alignement */
  transition: background-color 0.3s ease;
}
fieldset.etape.actif > legend > .etape-numero {
  background-color: #cbe8ff;
  color: #007acc;
}
.etape legend {
  font-weight: bold;
  font-size: 1.2em;
  margin-bottom: 5px;
}

label {
  display: block;
  margin-bottom: 2px; /* Très compact entre label et input */
  font-weight: 500;
}

input[type="text"],
select {
  width: 100%;
  padding: 4px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 2px;
  font-size: 1em;
	font-weight: 400;
  box-sizing: border-box;
}

.bouton-checkout {
  background: #007acc;
  color: white;
  border: none;
  padding: 10px 16px;
  font-size: 1em;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
  display: inline-block;
}

.bouton-checkout:hover {
  background: #005fa3;
}

.bouton-checkout.bouton-verrouille {
  background: #ccc !important;
  color: #666;
  cursor: not-allowed;
  opacity: 0.6;
}
.ville-option:hover {
  background: #e6f2ff;
}
#ville-container {
  position: relative;
  z-index: 999;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  max-height: 160px;
  overflow-y: auto;
}

.bouton-relai {
  background: #007acc;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
}
.bouton-relai:hover {
  background: #005fa3;
}
.carte-relai {
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f7f9fc;
  padding: 0.8em 1em;
  font-size: 0.9rem;
  line-height: 1.3; /* ⬅️ Réduction de l'interligne */
  margin-top: 8px;
}

.entete-relai {
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-wrap: wrap;
}

.adresse-relai {
  margin-bottom: 6px;
}
.horaire-relai {
  margin-top: 6px;
}
.table-horaire div {
  margin-bottom: 2px;
}
.bouton-fermer {
  background-color: #eee;
  border: none;
  color: #333;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85em;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  transition: background 0.3s;
  margin-bottom: 1em;
  display: inline-block;
  position: absolute;
  top: 16px;
  right: 20px;
}

.bouton-fermer:hover {
  background-color: #ddd;
}

@media screen and (max-width: 600px) {
  .carte-relai {
    font-size: 1rem;
    padding: 1em;
  }
  .horaire-relai {
    margin-top: 1em;
  }
  .bouton-fermer {
    top: 8px;
    right: 10px;
    padding: 0.5em 1em;
  }
  #Zone_Widget {
    display: flex;
    flex-direction: column;
  }
}

</style>