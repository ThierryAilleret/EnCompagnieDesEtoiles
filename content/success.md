+++
title = "Commande validée"
url    = "/success.html"
layout = "post_checkout"
+++
Merci pour votre commande !

Votre paiement a été effectué avec succès.

Nous préparons votre commande avec soin et vous informerons par email.

<div id="recap-commande" style="display:none; margin-top:1.5em;">
  <h3>Récapitulatif de votre commande</h3>
  <p id="recap-total"></p>

  <h4>Livraison en point relais</h4>
  <div id="recap-relais"></div>

  <h4>Adresse</h4>
  <div id="recap-adresse"></div>
</div>

<p id="recap-erreur" style="display:none; color:#777; font-style:italic;">
  (Récapitulatif indisponible — retrouvez les détails de votre commande dans l'e-mail de confirmation.)
</p>

<p><a href="/">Retour à l'accueil</a></p>

<script>
  // 📥 Afficher le récapitulatif depuis Stripe (avant nettoyage du localStorage)
  async function afficherRecapCommande() {
    const sessionId = localStorage.getItem("stripeSessionId");
    if (!sessionId) {
      document.getElementById("recap-erreur").style.display = "block";
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/recuperer-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      if (!res.ok) throw new Error("Session non récupérée");
      const data = await res.json();

      if (data.statut !== "paid") {
        document.getElementById("recap-erreur").style.display = "block";
        return;
      }
			
      const m = data.metadata;
			console.log("metadata récupérées :", data);
      const relais = (m.pointRelais || "").split(", ").filter(Boolean);
      const adresse = [m.adresse, m.complement, `${m.codePostal} ${m.ville}`].filter(Boolean);

      document.getElementById("recap-total").innerHTML =
        `<strong>Total payé :</strong> ${(data.montantTotal / 100).toFixed(2)} €`;

      document.getElementById("recap-relais").innerHTML = relais.length
        ? `<p style="font-weight:bold;">📍 ${relais[0]}</p><p>${relais.slice(1).join(", ")}</p>`
        : `<p>${adresse.join("<br>")}</p>`;

      document.getElementById("recap-adresse").innerHTML =
        `<p>${m.prenom || ""} ${m.nom || ""}<br>${m.email || ""}</p>`;

      document.getElementById("recap-commande").style.display = "block";
    } catch (e) {
      console.error("Erreur récap :", e);
      document.getElementById("recap-erreur").style.display = "block";
    }
  }

  afficherRecapCommande();

  // 🧹 Vider le panier
  localStorage.removeItem("panier");
  localStorage.removeItem("stripeSessionId");

  // 🔄 Mettre à jour l'affichage du mini-panier
  window.dispatchEvent(new Event("panierMisAJour"));
</script>