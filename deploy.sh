#!/bin/bash

# Génération du site
echo "🔧 Génération du site avec Hugo..."
hugo

# Vérification des changements
if git diff --quiet && git diff --cached --quiet; then
  echo "✅ Aucun changement à committer. Rien à pousser."
  exit 0
fi

# Affichage du résumé
echo "📋 Résumé des modifications :"
git status

# Ajout des fichiers
git add .

# Saisie du message de commit
echo "📝 Entrez le message de commit :"
read msg

# Commit
git commit -m "$msg"

# Push
echo "🚀 Poussée vers origin/main..."
git push origin main
