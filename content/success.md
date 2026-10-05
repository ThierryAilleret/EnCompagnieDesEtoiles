+++
title = "Commande validée"
url    = "/success.html"
layout = "post_checkout"
+++
<div id="recap-commande" style="display:none; max-width:640px; margin:0 auto;">
  <h3 style="margin-bottom:0.6em;">✅ Merci pour votre commande !</h3>
  <p style="color:#555; margin:0 0 1.2em;">
    Votre paiement a été accepté. Nous préparons votre commande avec soin
    et vous enverrons un e-mail de confirmation.
  </p>
  <div style="border:1px solid #ddd; border-radius:8px; overflow:hidden; font-size:0.95em;">
    <div id="recap-ligne-total" style="display:flex; justify-content:space-between; padding:0.8em 1em; background:#f5f5f0; font-weight:bold;"></div>
    <div id="recap-ligne-livraison" style="display:flex; justify-content:space-between; gap:1.5em; padding:0.8em 1em; border-top:1px solid #ddd;"></div>
    <div id="recap-ligne-contact" style="display:flex; justify-content:space-between; gap:1.5em; padding:0.8em 1em; border-top:1px solid #ddd;"></div>
  </div>
  <p style="margin-top:1.2em;"><a href="/">← Retour à la boutique</a></p>
</div>

<p id="recap-erreur" style="display:none; color:#777; font-style:italic;">
  (Récapitulatif indisponible — retrouvez les détails de votre commande dans l'e-mail de confirmation.)
</p>

<script>
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

      const m = data.metadata  | {};
      const ligne = (etiquette, valeur) =>
        `<span style="color:#777; white-space:nowrap;">${etiquette}</span><span style="text-align:right;">${valeur || "—"}</span>`;

      // 💰 Total
      document.getElementById("recap-ligne-total").innerHTML =
        ligne("Total payé", `<strong>${(data.montantTotal / 100).toFixed(2)} €</strong>`);

      // 📦 Livraison : adresse, relais, ou les deux (mode deux colis)
      const adresse = [m.adresse, m.complement, `${m.codePostalLivraison || m.codePostal} ${m.villeLivraison || m.ville}`].filter(Boolean).join("<br>");
      const relais = (m.pointRelais || "").split(", ").filter(Boolean);
      let livr;
      if (m.modeLivraison === "deux-colis" && relais.length) {
        livr = `${m.articlesPoste ? `📦 ${m.articlesPoste}<br>` : ""}${adresse}<br><br>` +
               `${m.articlesRelais ? `📍 ${m.articlesRelais}<br>` : ""}${relais.join("<br>")}`;
      } else if (relais.length) {
        livr = `📍 ${relais.join("<br>")}`;
      } else {
        livr = adresse;
      }
      document.getElementById("recap-ligne-livraison").innerHTML = ligne("Livraison", livr);

      // 👤 Contact
      document.getElementById("recap-ligne-contact").innerHTML =
        ligne("Contact", `${m.prenom || ""} ${m.nom || ""}<br>${m.email || ""}`);

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
  window.dispatchEvent(new Event("panierMisAJour"));
</script>