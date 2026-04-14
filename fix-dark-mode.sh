#!/bin/bash
# =============================================================
# fix-dark-mode.sh — NutriDoc
# Supprime le div theme-selector-container fixé en bas à droite
# et son CSS associé dans toutes les pages HTML.
# À exécuter depuis la RACINE de nutri-platform/
# =============================================================

echo "Nettoyage du theme-selector-container dans tous les HTML..."
echo ""

# 1. Supprimer la ligne du div container
sed -i '/<div id="theme-selector-container"/d' *.html
echo "OK : div theme-selector-container supprime"

# 2. Supprimer le bloc CSS .theme-selector-wrapper { position: fixed ... }
# Ce bloc fait typiquement 6-8 lignes — on cible les lignes clés
sed -i '/\.theme-selector-wrapper {/,/^    }/d' *.html
echo "OK : CSS .theme-selector-wrapper supprime"

# 3. Vérification
REMAIN=$(grep -l 'theme-selector-container\|theme-selector-wrapper' *.html 2>/dev/null | wc -l)
if [ "$REMAIN" -eq 0 ]; then
  echo ""
  echo "SUCCES — Plus aucun theme-selector-container dans les pages HTML."
else
  echo ""
  echo "Reste $REMAIN fichier(s) avec des references — a verifier manuellement :"
  grep -l 'theme-selector-container\|theme-selector-wrapper' *.html 2>/dev/null
fi

echo ""
echo "Pusher avec :"
echo "  git add js/ui/dark-mode.js"
echo "  git add *.html"
echo "  git commit -m 'fix: dark mode toggle dans le header, fin du ton-sur-ton'"
echo "  git push"
