+++  
title = "Commande validée"  
url    = "/success.html"
layout = "post_checkout"
+++
Merci pour votre commande !

Votre paiement a été effectué avec succès.

Nous préparons votre commande avec soin et vous informerons par email.

<div id="facture-container" style="margin-top:2em;"></div>

<a href="/">Retour à l'accueil</a>

<script>
document.addEventListener("DOMContentLoaded", async () => {
  // Récupérer l'ID de session Stripe stocké localement
  const sessionId = localStorage.getItem("stripeSessionId");
  if (!sessionId) return;

  try {
    const res = await fetch("/.netlify/functions/get-invoice-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });

    const data = await res.json();
    if (data.invoiceUrl) {
      const lien = document.createElement("a");
      lien.href = data.invoiceUrl;
      lien.textContent = "📄 Télécharger votre facture";
      lien.target = "_blank";
      lien.style.display = "inline-block";
      lien.style.marginTop = "1em";
      lien.style.fontWeight = "bold";
      lien.style.color = "#2e7d32";

      document.getElementById("facture-container").appendChild(lien);
    }
  } catch (err) {
    console.error("Erreur récupération facture :", err);
  }
	
	// Nettoyage, on supprime stripeSessionId
	localStorage.removeItem("stripeSessionId");
});
</script>