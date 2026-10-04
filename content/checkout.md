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

<script>
const REGEX_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

document.addEventListener("DOMContentLoaded", () => {

  // 🔁 Surveille les champs de facturation
  ["nom", "prenom", "adresse", "mail"].forEach(id => {
    const champ = document.getElementById(id);
    if (champ) champ.addEventListener("input", surveillerEtape1);
  });

  // 🔍 Autocomplétion Géoportail, réutilisable sur les deux adresses
  attacherAutocompletion("adresse", item => {
    remplirAdresseGeo(item, "adresse");
    localStorage.setItem("codePostal", item.zipcode  || "");
    localStorage.setItem("ville", item.city || item.oldcity || "");
  });

  attacherAutocompletion("adresse-livraison", item => {
    remplirAdresseGeo(item, "adresse-livraison");
    localStorage.setItem("codePostalLivraison", item.zipcode || "");
    localStorage.setItem("villeLivraison", item.city || item.oldcity || "");
  });

  // 📋 Case « même adresse » : recopie la facturation vers la livraison
  const memeAdresse = document.getElementById("meme-adresse");
  memeAdresse.addEventListener("change", () => {
    const bloc = document.getElementById("bloc-adresse-livraison-detail");
    recopierFacturationVersLivraison();
    bloc.style.display = memeAdresse.checked ? "none" : "block";
    if (memeAdresse.checked) {
      // Adresse déjà fiable (copie de la facturation) : pas besoin de revalider
      window._livraisonPosteValide = true;
      mettreAJourBoutonValidation();
    } else {
      window._livraisonPosteValide = false;
			mettreAJourBoutonValidation();
    }
    verifierEtapeLivraison();
  });

  // Surveille les champs de livraison (toute saisie invalide la validation)
  ["adresse-livraison", "complement-livraison"].forEach(id => {
    const champ = document.getElementById(id);
    if (champ) champ.addEventListener("input", () => {
      window._livraisonPosteValide = false;
      mettreAJourBoutonValidation();
      verifierEtapeLivraison();
    });
  });

  // 📻 Choix du mode (uniquement affiché si cartes seules)
  document.querySelectorAll("input[name='mode-cartes']").forEach(radio => {
    radio.addEventListener("change", () => {
      afficherSectionLivraison();
      verifierEtapeLivraison();
    });
  });

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
    Responsive: true,
    ShowResultsOnMap: false,
    OnParcelShopSelected: function (data) {
      window._relaisValide = false;
      const zoneInfo = document.getElementById("relai-selectionne");
      const champ = document.getElementById("info-relai");
      if (!zoneInfo || !champ) return;

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

      mettreAJourBoutonValidation();
      verrouillerEtape3();
    }
  });

  afficherPanierDansCheckout();
  surveillerEtape1();
});

window.addEventListener("panierMisAJour", () => {
  window._relaisValide = false;
  window._livraisonPosteValide = false;
  afficherPanierDansCheckout();
  afficherSectionLivraison();
  verifierEtatPaiement();
});

// ============================================================
// 🛰️ Autocomplétion Géoportail générique
// ============================================================
function attacherAutocompletion(inputId, onChoix) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const cont = document.getElementById("autocomplete-container-" + inputId);
  if (!cont) return;

  input.addEventListener("input", async e => {
    const q = e.target.value.trim();
    if (q.length < 3) { cont.style.display = "none"; return; }

    const res = await fetch(`https://data.geopf.fr/geocodage/completion?text=${encodeURIComponent(q)}&limit=5&terr=METROPOLE`);
    const data = await res.json();

    cont.innerHTML = "";
    cont.style.display = "none";

    let count = 0;
    data.results?.forEach(item => {
      const div = document.createElement("div");
      div.className = "suggestion";
      div.textContent = item.fulltext || `${item.number} ${item.street} ${item.city}`;
      div.addEventListener("click", () => {
        input.value = div.textContent;
        onChoix(item);
        cont.innerHTML = "";
        cont.style.display = "none";
        verifierEtapeLivraison();
      });
      cont.appendChild(div);
      count++;
    });

    cont.style.display = count ? "block" : "none";
  });
}

function remplirAdresseGeo(item, adresseId) {
  const adresse = item.fulltext || `${item.street}, ${item.zipcode} ${item.city}`;
  document.getElementById(adresseId).value = adresse;
}

// ============================================================
// 📦 Modes de livraison selon le panier
// ============================================================
function calculerModesLivraison(panier) {
  const cats = new Set(panier.map(i => i.categorie));
  return {
    aLuminaires:  cats.has("luminaires"),
    aTableaux:    cats.has("tableaux_origami"),
    aCartes:      cats.has("carte"),
    cartesSeules: cats.size === 1 && cats.has("carte"),
    deuxColis:    cats.has("luminaires") && cats.has("tableaux_origami")
  };
}

function modeCartesChoisi() {
  return document.querySelector("input[name='mode-cartes']:checked")?.value;
}

// Le relais est-il nécessaire ?
function relaisRequis() {
  const panier = JSON.parse(localStorage.getItem("panier")) || [];
  const modes = calculerModesLivraison(panier);
  return modes.aTableaux;
}

// Une livraison par La Poste est-elle nécessaire ?
function posteRequise() {
  const panier = JSON.parse(localStorage.getItem("panier")) || [];
  const modes = calculerModesLivraison(panier);
  return modes.aLuminaires || modes.cartesSeules;   // modeCartesChoisi() n'influence plus
}

function afficherSectionLivraison() {
  const panier = JSON.parse(localStorage.getItem("panier")) || [];
  const modes = calculerModesLivraison(panier);

  const blocChoix        = document.getElementById("choix-poste");
  const blocChoixRelais  = document.getElementById("choix-relais");
  const messageDeuxColis = document.getElementById("message-deux-colis");
  const blocAdressePoste = document.getElementById("bloc-adresse-poste");
  const widgetRelai      = document.getElementById("zone-widget-relai");

  if (modes.cartesSeules) {
    blocChoix.style.display        = "none";
    blocChoixRelais.style.display  = "none";
    messageDeuxColis.style.display = "none";
    blocAdressePoste.style.display = "block";
    widgetRelai.style.display      = "none";
  } else if (modes.deuxColis) {
    blocChoix.style.display        = "none";
    blocChoixRelais.style.display  = "none";
    messageDeuxColis.style.display = "block";
    blocAdressePoste.style.display = "block";
    widgetRelai.style.display      = "block";
  } else if (modes.aTableaux) {
    blocChoix.style.display        = "none";
    blocChoixRelais.style.display  = "none";
    messageDeuxColis.style.display = "none";
    blocAdressePoste.style.display = "none";
    widgetRelai.style.display      = "block";
  } else {
    blocChoix.style.display        = "none";
    blocChoixRelais.style.display  = "none";
    messageDeuxColis.style.display = "none";
    blocAdressePoste.style.display = "block";
    widgetRelai.style.display      = "none";
  }

  mettreAJourBoutonValidation();
}

// ============================================================
// 🔄 Recopie facturation → livraison
// ============================================================
function recopierFacturationVersLivraison() {
  document.getElementById("adresse-livraison").value =
    document.getElementById("adresse").value.trim();
  document.getElementById("complement-livraison").value =
    document.querySelector("[name='complement_adresse']").value.trim();
  localStorage.setItem("codePostalLivraison", localStorage.getItem("codePostal") || "");
  localStorage.setItem("villeLivraison", localStorage.getItem("ville") || "");
}

// ============================================================
// 🔓 Verrouillage de l'étape 3
// ============================================================
function verrouillerEtape3() {
  document.getElementById("step-3").classList.remove("actif");
  document.getElementById("step-3").style.display = "none";
}

function deverrouillerEtape3() {
  const etape3 = document.getElementById("step-3");
  etape3.style.display = "block";
  etape3.classList.add("actif");

  // 💰 Total + bouton de paiement
  const panier = JSON.parse(localStorage.getItem("panier")) || [];
  const totaux = calculerTotaux(panier);
  const prixTotal = document.getElementById("prix-total");
  if (prixTotal) {
    prixTotal.innerHTML = `<strong>Total à payer :</strong> ${totaux.totalFinal.toFixed(2)} €`;
    prixTotal.style.display = "block";
  }
  const boutonPaiement = document.getElementById("checkout-button");
  boutonPaiement.classList.remove("bouton-verrouille");
  boutonPaiement.style.display = "block";
}

// ============================================================
// 🎛️ Bouton de validation contextuel
// ============================================================
function mettreAJourBoutonValidation() {
  const bouton = document.getElementById("validation-livraison-button");
  if (!bouton) return;

  if (relaisRequis()) {
    bouton.textContent = "Valider ce point relais";
    bouton.style.display = (window._pointRelaisId && !window._relaisValide) ? "inline-block" : "none";
  } else if (posteRequise()) {
    bouton.textContent = "Valider cette adresse de livraison";
    const dejaValidee = window._livraisonPosteValide === true;
    bouton.style.display = dejaValidee ? "none" : "inline-block";
  } else {
    bouton.style.display = "none";
  }
}

// Vérifie que l'adresse de livraison (mode Poste) est complète
function adresseLivraisonComplete() {
  if (document.getElementById("meme-adresse").checked) {
    recopierFacturationVersLivraison();
    return true; // copie de la facturation, déjà validée à l'étape 1
  }
  const a = document.getElementById("adresse-livraison").value.trim();
  return a.length >= 5 && (localStorage.getItem("codePostalLivraison") || "").length >= 4;
}

// ============================================================
// ✅ Validation de la livraison (bouton contextuel)
// ============================================================
function validerLivraison() {
  if (relaisRequis()) {
    if (!window._pointRelaisId) {
      alert("Veuillez d'abord choisir un point relais sur la carte.");
      return;
    }
    window._relaisValide = true;
  }
  if (posteRequise()) {
    if (!adresseLivraisonComplete()) {
      alert("Veuillez renseigner une adresse de livraison complète (sélectionnez-la via les suggestions pour garantir sa validité).");
      return;
    }
    window._livraisonPosteValide = true;
  }
  mettreAJourBoutonValidation();
  verifierEtapeLivraison();
}

// Appelée à chaque changement pertinent : détermine si tout est prêt pour payer
function verifierEtapeLivraison() {
  const panier = JSON.parse(localStorage.getItem("panier")) || [];
  if (panier.length === 0) { verrouillerEtape3(); return; }

  const etape2Visible = document.getElementById("step-2").style.display !== "none";
  if (!etape2Visible) { verrouillerEtape3(); return; }

  if (relaisRequis() && window._relaisValide !== true) { verrouillerEtape3(); return; }
  if (posteRequise() && window._livraisonPosteValide !== true) { verrouillerEtape3(); return; }

  deverrouillerEtape3();
}

function surveillerEtape1() {
  const nom     = document.getElementById("nom").value.trim();
  const prenom  = document.getElementById("prenom").value.trim();
  const adresse = document.getElementById("adresse").value.trim();
  const mail    = document.getElementById("mail").value.trim();
  const champMail = document.getElementById("mail");

  // ✅ Validation du format de l'e-mail
  const mailValide = REGEX_MAIL.test(mail);

  const etape1 = document.getElementById("step-1");
  const etape2 = document.getElementById("step-2");
  const etape_1_complete = nom && prenom && adresse && mail && mailValide;

  if (mail && !mailValide) {
    champMail.style.borderColor = "#d9534f";
    champMail.title = "Adresse e-mail invalide";
  } else {
    champMail.style.borderColor = "";
    champMail.title = "";
  }

  if (etape_1_complete) {
    // Étape 2 : complètement masquée jusqu'ici, on la révèle
    etape2.style.display = "block";
		etape2.classList.add("actif");
    afficherSectionLivraison();
    verifierEtapeLivraison();
  } else {
    etape2.style.display = "none";
		etape2.classList.remove("actif");
    verrouillerEtape3();
  }
}

function verifierEtatPaiement() {
  const panier = JSON.parse(localStorage.getItem("panier")) || [];
  if (panier.length === 0) {
    verrouillerEtape3();
    document.getElementById("step-2").style.display = "none";
		etape2.classList.remove("actif");
  } else {
    surveillerEtape1();
  }
}

// ============================================================
// 🧾 Résumé du panier
// ============================================================
function afficherPanierDansCheckout() {
  const panierJSON = localStorage.getItem("panier");
  const panier = panierJSON ? JSON.parse(panierJSON) : [];
  const ul = document.getElementById("panier-resume");
  const totaux = calculerTotaux(panier);

  ul.innerHTML = "";

  // 🧹 Panier vide : affichage propre, pas de total fantôme
  if (panier.length === 0) {
    ul.innerHTML = `<li style="color:#777; font-style:italic;">Votre panier est vide.</li>`;
    document.getElementById("total-commande").innerHTML = "";
    return;
  }

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
  });

  let details = "";

  if (totaux.reductionCartes > 0) {
    details += `<div style="color:#777; font-style:italic; font-size:0.8rem;">Réduction cartes (-15%) : -${totaux.reductionCartes.toFixed(2)} €</div>`;
  }
  if (totaux.reductionOrigami > 0) {
    details += `<div style="color:#777; font-style:italic; font-size:0.8rem;">Réduction tableaux (-15%) : -${totaux.reductionOrigami.toFixed(2)} €</div>`;
  }
  details += `<div style="color:#777; font-style:italic; font-size:0.8rem;">
    ${totaux.fraisPort === 0 ? "Frais de port offerts" : `Frais de port : ${totaux.fraisPort.toFixed(2)} €`}
  </div>`;

  document.getElementById("total-commande").innerHTML = `
    <strong>Total :</strong> ${totaux.totalFinal.toFixed(2)} €
    ${details}
  `;
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
          <div id="autocomplete-container-adresse" class="autocomplete-box"></div>
        </div>
        <label>Complément d'addresse :<br><input type="text" name="complement_adresse" id="complement_adresse"/></label>
        <label>Mail :<br><input type="text" name="mail" id="mail" required placeholder="nom@domaine.fr" /></label>
      </fieldset>
      <!-- Étape 2 : Livraison (entièrement masquée tant que l'étape 1 est incomplète) -->
      <fieldset id="step-2" class="etape" style="display:none;">
        <legend><span class="etape-numero">2</span> Livraison</legend>
        <div id="livraison-section">
          <!-- Explication deux colis -->
          <div id="message-deux-colis" style="display:none; padding:0.8em; background:#f5f5f0; border-radius:6px; margin-bottom:1em;">
            ⚠️ Votre commande contient des <strong>luminaires</strong> (expédiés par La Poste)
            et des <strong>tableaux</strong> (expédiés en point relais).
            Elle partira donc en <strong>deux colis</strong> : l'un à l'adresse de livraison ci-dessous,
            l'autre au point relais. Les frais de port restent <strong>offerts</strong>.
          </div>
          <!-- Choix du mode : uniquement si cartes seules -->
          <div id="choix-poste" style="display:none; margin-bottom:1em;">
            <label><input type="radio" name="mode-cartes" value="poste" checked> Envoi par La Poste</label>
          </div>
					<!-- Livraison par La Poste : directement sous le bouton radio "La Poste" -->
          <div id="bloc-adresse-poste" style="display:none; margin-bottom:1em;">
            <label>
              <input type="checkbox" id="meme-adresse" checked />
              Livrer à l'adresse de facturation
            </label>
            <div id="bloc-adresse-livraison-detail" style="display:none; margin-top:0.5em;">
              <div style="position:relative;">
                <label>Adresse de livraison :<br>
                  <input type="text" id="adresse-livraison" name="adresse-livraison" autocomplete="off"
                         placeholder="Saisissez une adresse" />
                </label>
                <div id="autocomplete-container-adresse-livraison" class="autocomplete-box"></div>
              </div>
              <label>Complément :<br>
                <input type="text" id="complement-livraison" name="complement-livraison" />
              </label>
            </div>
          </div>
          <!-- Widget Mondial Relay : directement sous le bouton radio "Mondial Relay" -->
          <div id="choix-relais" style="display:none; margin-bottom:1em;">
            <label><input type="radio" name="mode-cartes" value="relais"> Point relais Mondial Relay</label>
          </div>
					<div id="zone-widget-relai" style="display:none;">
            <div id="Zone_Widget"></div>
            <input type="hidden" id="Target_Widget" name="point-relay" />
          </div>
          <div id="relai-selectionne" style="display:none; margin-top:0.5em; margin-bottom:0.5em;">
            <div id="titre-relai-selectionne"><strong>Relais sélectionné :</strong></div>
            <div id="info-relai"></div>
          </div>
          <!-- Bouton de validation contextuel (relais OU adresse) -->
          <button type="button" id="validation-livraison-button" class="bouton-validation-relai" style="display:none;">
            Valider
          </button>
        </div>
      </fieldset>
      <!-- Étape 3 : Paiement (masquée tant que la livraison n'est pas validée) -->
      <fieldset id="step-3" class="etape" style="display:none;">
        <legend><span class="etape-numero">3</span> Paiement</legend>
        <div id="prix-total">Total : ... €</div>
        <button type="button" id="checkout-button" class="bouton-checkout bouton-verrouille" style="display:none;">
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
document.getElementById("validation-livraison-button").addEventListener("click", function (event) {
  event.preventDefault();
  validerLivraison();   // deverrouillerEtape3() s'occupe du reste
});

document.getElementById("checkout-button").addEventListener("click", function (event) {
  event.preventDefault();

  let panier = JSON.parse(localStorage.getItem("panier")) || [];
  panier = panier.map(item => ({
    ...item,
    monnaie: item.monnaie === "€" ? "eur" : item.monnaie
  }));

  // S'assurer que l'adresse de livraison est à jour si « même adresse »
  if (document.getElementById("meme-adresse").checked) {
    recopierFacturationVersLivraison();
  }

  const modes = calculerModesLivraison(panier);
  const modeCartes = modeCartesChoisi();

  // Mode de livraison global (pour les métadonnées)
  let modeLivraison = "poste";
  if (modes.deuxColis) modeLivraison = "deux-colis";
  else if (relaisRequis()) modeLivraison = "relais";

  // Répartition des articles par colis
  const articlesRelais = panier
    .filter(i => i.categorie === "tableaux_origami"
 || (i.categorie === "carte" && (modes.aTableaux || modeCartes === "relais")))
    .map(i => `${i.quantite}x ${i.nom}`);
  const articlesPoste = panier
    .filter(i => !articlesRelais.includes(`${i.quantite}x ${i.nom}`))
    .map(i => `${i.quantite}x ${i.nom}`);

  const client = {
    nom: document.getElementById("nom").value.trim(),
    prenom: document.getElementById("prenom").value.trim(),
    email: document.getElementById("mail").value.trim(),
    adresse: document.getElementById("adresse").value.trim(),
    complement: document.querySelector("[name='complement_adresse']").value.trim(),
    codePostal: localStorage.getItem("codePostal") || "",
    ville: localStorage.getItem("ville") || "",
    // Livraison
    adresseLivraison: document.getElementById("adresse-livraison").value.trim(),
    complementLivraison: document.getElementById("complement-livraison").value.trim(),
    codePostalLivraison: localStorage.getItem("codePostalLivraison") || "",
    villeLivraison: localStorage.getItem("villeLivraison") || "",
    memeAdresse: document.getElementById("meme-adresse").checked,
    modeLivraison,
    pointRelaisId: window._pointRelaisId || "",
    pointRelais: window._pointRelaisAdresse || "",
    articlesPoste: articlesPoste.join(" ; "),
    articlesRelais: articlesRelais.join(" ; ")
  };

  if (!client.email || !REGEX_MAIL.test(client.email)) {
    alert("Veuillez entrer une adresse e-mail valide.");
    return;
  }

  fetch("/.netlify/functions/creer-session-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ panier, client })
  })
  .then(async response => {
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || "Réponse serveur non valide");
    }
    return response.json();
  })
  .then(data => {
    if (!data.sessionId) throw new Error("Session Stripe non reçue");

    localStorage.setItem("stripeSessionId", data.sessionId);

    if (!window.stripePublicKey || !window.stripePublicKey.startsWith("pk_")) {
      alert("Clé Stripe invalide ou manquante.");
      return;
    }
    const stripe = Stripe(window.stripePublicKey);
    stripe.redirectToCheckout({ sessionId: data.sessionId });
  })
  .catch(error => {
    console.error("💥 Erreur Stripe :", error);
    alert("Erreur : " + error.message);
  });
});
</script>