+++  
title = "Commande validée"  
url    = "/success.html"
layout = "post_checkout"
+++
Merci pour votre commande !

Votre paiement a été effectué avec succès.

Nous préparons votre commande avec soin et vous informerons par email.

<a href="/">Retour à l'accueil</a>

<script>
  // 🧹 Vider le panier
  localStorage.removeItem("panier");

  // 🔄 Mettre à jour l'affichage du mini-panier si nécessaire
  window.dispatchEvent(new Event("panierMisAJour"));

</script>