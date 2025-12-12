+++  
title = "Finaliser ma commande"  
url    = "/checkout.html"  
layout = "checkout"  
+++

<!-- Autocomplétion d'adresse via Geoportail -->
<script>
document.addEventListener("DOMContentLoaded", () => {

  // 🔁 Surveille les champs nom, prénom, adresse, mail
  ["nom", "prenom", "adresse", "mail", "nom_exp", "prenom_exp", "adresse_exp", "mail_exp"].forEach(id => {
    const champ = document.getElementById(id);
    if (champ) {
      champ.addEventListener("input", surveillerEtapes);
    }
  });

	// Autocomplétion adresse
  const adresseInput = document.getElementById("adresse");
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
	
	// Autocomplétion adresse_exp
  const adresseExpInput = document.getElementById("adresse_exp");
	adresseExpInput.addEventListener("input", async e => {
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
				adresseExpInput.value = div.textContent;
				remplirAdresseExpGeo(item);
				cont.innerHTML = "";
				cont.style.display = "none";
			});
			cont.appendChild(div);
			count++;
		});
		cont.style.display = count ? "block" : "none"
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

	document.getElementById("total-commande").innerHTML = `<strong>Total :</strong> ${total} € frais de port inclus`;
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

function remplirAdresseExpGeo(item) {
  const cp    = item.zipcode || "";
  const ville = item.city || item.oldcity || "";
  const pays  = item.country || "";
  const adresse = item.fulltext || `${item.street}, ${cp} ${ville}`;
  // Préremplit le champ Adresse
  document.getElementById("adresse_exp").value = adresse;
	// Stockage
	localStorage.setItem('codePostal_exp', cp);
	localStorage.setItem('ville_exp', ville);
  window.adresse_expGoogleValidee = true;
}

function surveillerEtapes() {
  const nom     = document.getElementById("nom").value.trim();
  const prenom  = document.getElementById("prenom").value.trim();
  const adresse = document.getElementById("adresse").value.trim();
  const mail = document.getElementById("mail").value.trim();

  const nom_exp     = document.getElementById("nom_exp").value.trim();
  const prenom_exp  = document.getElementById("prenom_exp").value.trim();
  const adresse_exp = document.getElementById("adresse_exp").value.trim();
  const mail_exp    = document.getElementById("mail_exp").value.trim();

  const etape1 = document.getElementById("step-1");
  const etape2 = document.getElementById("step-2");
  const etape3 = document.getElementById("step-3");

  const etape_1_complete = nom && prenom && adresse && mail;
  if (etape_1_complete) {
    etape2.classList.add("actif");
	  const etape_2_complete = nom_exp && prenom_exp && adresse_exp && mail_exp;
		if (etape_2_complete) {
			etape3.classList.add("actif");
			const prixTotal = document.getElementById("prix-total");
			prixTotal.style.display = "block";
			const boutonPaiement = document.getElementById("checkout-button");
			boutonPaiement.classList.remove("bouton-verrouille");
			boutonPaiement.style.display = "block";
		} else {
			etape3.classList.remove("actif");
			const boutonPaiement = document.getElementById("checkout-button");
			boutonPaiement.classList.add("bouton-verrouille")		
		}
  } else {
    etape2.classList.remove("actif");
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
    // ❌ Retire la classe actif pour les étapes
    steps.forEach(step => step.classList.remove("actif"));
  } else {
    // ✅ Ajoute actif pour les étapes si l'adresse est remplie
    surveillerEtapes(); // Cela réactive step-2 et step-3 si conditions sont remplies
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
        <legend><span class="etape-numero">1</span> Coordonnées de facturation</legend>
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
        <label>Nom :<br><input type="text" name="nom_exp" id="nom_exp" required /></label>
        <label>Prénom :<br><input type="text" name="prenom_exp" id="prenom_exp" required /></label>
				<div style="position:relative;">
					<label>Adresse :<br>
						<input type="text" id="adresse_exp" name="adresse_exp" autocomplete="off" required
									 placeholder="Saisissez une adresse" />
					</label>
					<div id="autocomplete-container"></div>
				</div>
        <label>Complément d'addresse :<br><input type="text" name="complement_adresse_exp" id="complement_adresse_exp"/></label>
        <label>Mail :<br><input type="text" name="mail_exp" id="mail_exp" required /></label>
			</fieldset>
      <!-- Étape 3 : Paiement -->
      <fieldset id="step-3" class="etape">
        <legend><span class="etape-numero">3</span> Paiement</legend>
        <div id="prix-total" style="display:none">Total : ... €</div>
				<button type="button" id="checkout-button" class="bouton-checkout  bouton-verrouille" style="display:none">
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
		<p id="total-commande"><strong>Total :</strong> ... € frais de port inclus</p>
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

    nom_exp: document.getElementById("nom_exp").value.trim(),
    prenom_exp: document.getElementById("prenom_exp").value.trim(),
    email_exp: document.getElementById("mail_exp").value.trim(),
    adresse_exp: document.getElementById("adresse_exp").value.trim(),
    complement_exp: document.querySelector("[name='complement_adresse_exp']").value.trim(),
    codePostal_exp: localStorage.getItem("codePostal_exp") || "",
    ville_exp: localStorage.getItem("ville_exp") || "",
  };

  // Vérification des adresses mail
  if (!client.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
    alert("Veuillez entrer une adresse email valide pour la facturation.");
    return;
  }
  if (!client.email_exp || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email_exp)) {
    alert("Veuillez entrer une adresse email valide pour la livraison.");
    return;
  }

  // Envoi au backend
  fetch("/.netlify/functions/creer-session-checkout", {
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

		if (!window.stripePublicKey || !window.stripePublicKey.startsWith("pk_")) {
			alert("Clé Stripe invalide ou manquante.");
			console.error("❌ Clé Stripe non valide :", window.stripePublicKey);
			return;
		}
    // Redirection vers Stripe Checkout
		const stripe = Stripe(window.stripePublicKey);
    stripe.redirectToCheckout({ sessionId: data.sessionId });
  })
  .catch(error => {
    console.error("💥 Erreur Stripe :", error);
    alert("Erreur : " + error.message);
  });
});
</script>