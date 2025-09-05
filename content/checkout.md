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

  // 🔁 Surveille les champs nom, prénom, adresse, mail
  ["nom", "prenom", "adresse", "mail"].forEach(id => {
    const champ = document.getElementById(id);
    if (champ) {
      champ.addEventListener("input", surveillerEtape1);
    }
  });

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

	// document.getElementById("bouton-relai").addEventListener("click", afficherPopupMondialRelay);

	const cp = localStorage.getItem('codePostal')?.trim() || "";
	const ville = localStorage.getItem('ville')?.trim() || "";

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
				<img src="${article.image}" alt="${article.nom}" style="height:48px; width:auto; border-radius:4px;">
				<div>
					<strong>${article.nom}</strong><br>
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



  window.adresseGoogleValidee = true;

}

function surveillerEtape1() {
  const nom     = document.getElementById("nom").value.trim();
  const prenom  = document.getElementById("prenom").value.trim();
  const adresse = document.getElementById("adresse").value.trim();
  const mail = document.getElementById("mail").value.trim();

  const etape1 = document.getElementById("step-1");
  const etape2 = document.getElementById("step-2");

  const etape_1_complete = nom && prenom && adresse && mail;

  if (etape_1_complete) {
    etape2.classList.add("actif");
	  // Affiche ou masque les points relais
		// const boutonrelai = document.getElementById("bouton-relai");
		// boutonrelai.style.display = "inline-block";
		const widgetrelai = document.getElementById("zone-widget-relai");
		widgetrelai.style.display = "inline-block";
  } else {
    etape2.classList.remove("actif");
		const widgetrelai = document.getElementById("zone-widget-relai");
		widgetrelai.style.display = "none";

		etape3.classList.remove("actif");
		const boutonPaiement = document.getElementById("checkout-button");
		boutonPaiement.classList.add("bouton-verrouille");
  }
}

function verifierEtatPaiement() {
  const panier = JSON.parse(localStorage.getItem("panier")) || [];
  const boutonStripe = document.getElementById("checkout-button");

  const steps = [
    document.getElementById("step-1"),
    document.getElementById("step-2"),
    document.getElementById("step-3")
  ];

  if (!boutonStripe) return;

  if (panier.length === 0) {
    //boutonStripe.disabled = true;
    //boutonStripe.classList.add("bouton-verrouille");

    // ❌ Retire la classe actif pour les étapes
    steps.forEach(step => step.classList.remove("actif"));
  } else {
   //boutonStripe.disabled = false;
    //boutonStripe.classList.remove("bouton-verrouille");

    // ✅ Ajoute actif pour les étapes si l'adresse est remplie
    surveillerEtape1(); // Cela réactive step-2 et step-3 si conditions sont remplies
  }
}


window.addEventListener("panierMisAJour", function () {
    verifierEtatPaiement();
});

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
        <label>Complément d'addresse :<br><input type="text" name="complement_adresse" id="complement_adresse"/></label>
        <label>Mail :<br><input type="text" name="mail" id="mail" required /></label>
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
					<!--<button type="button" id="bouton-relai" class="bouton-relai" style="display:none;">📍 Choisir un Point Relais</button>-->
					<!-- Zone d'affichage du point relais choisi -->
					<div id="relai-selectionne" style="display:none; margin-top:0.5em; margin-bottom:0em;">
						<div id="titre-relai-selectionne"><strong>Relais sélectionné :</strong></div>
						<div id="info-relai"></div>
					</div>
					<!-- Zone d’intégration directe du widget Mondial Relay -->
					<div id="zone-widget-relai" style="display:none; margin-top:1em;">
						<div id="Zone_Widget"></div>
						<input type="hidden" id="Target_Widget" name="point-relay" />
					</div>
        </div>
			</fieldset>
      <!-- Étape 3 : Paiement -->
      <fieldset id="step-3" class="etape">
        <legend><span class="etape-numero">3</span> Paiement</legend>
        <div id="prix-total">Total : ... €</div>
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

  // Récupération du panier
  let panier = JSON.parse(localStorage.getItem("panier")) || [];

  // Normaliser la monnaie pour Stripe
  panier = panier.map(item => ({
    ...item,
    monnaie: item.monnaie === "€" ? "eur" : item.monnaie
  }));

  // Récupération des données client depuis le formulaire
  const client = {
    nom: document.getElementById("nom").value.trim(),
    prenom: document.getElementById("prenom").value.trim(),
    email: document.getElementById("mail").value.trim(),
    adresse: document.getElementById("adresse").value.trim(),
    complement: document.querySelector("[name='complement_adresse']").value.trim(),
    codePostal: localStorage.getItem("codePostal") || "",
    ville: localStorage.getItem("ville") || "",
    pointRelais: window._pointRelaisAdresse || ""
  };

  // Vérification minimale
  if (!client.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
    alert("Veuillez entrer une adresse email valide.");
    return;
  }

  // Envoi au backend
  fetch("https://encompagniedesetoiles.fr/.netlify/functions/creer-session-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ panier, client })
  })
  .then(response => {
    if (!response.ok) throw new Error("Réponse serveur non valide");
    return response.json();
  })
  .then(data => {
    if (!data.sessionId) throw new Error("Session Stripe non reçue");

    // ✅ Stocker l'ID de session pour la page success
    localStorage.setItem("stripeSessionId", data.sessionId);
		console.log("Session enregistrée :", data.sessionId);


    // Redirection vers Stripe Checkout
    const stripe = Stripe("pk_test_51RkqVwGEPWcc8pKFZevbWerlrXRo1mIBwK9XfkO2eFBn9ulLVVXhpvozeHjDM7D3Xdu9hm3oUdTLhMO9UZfbPIYI00OmhDMt0o");
    stripe.redirectToCheckout({ sessionId: data.sessionId });
  })
  .catch(error => {
    console.error("💥 Erreur Stripe :", error);
    alert("Erreur : " + error.message);
  });
});
</script>