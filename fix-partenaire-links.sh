#!/bin/bash
# =============================================================
# fix-partenaire-links.sh — NutriDoc
# Désactive les 2 liens de nav vers les pages partenaire
# dans partenariats.html (coming soon)
# À exécuter depuis la RACINE de nutri-platform/
# =============================================================

echo "Désactivation des liens partenaire dans partenariats.html..."

# Lien "CRM commandes" → désactivé avec badge
sed -i 's|<a href="partenaire-crm\.html">CRM commandes</a>|<a href="partenaire-crm.html" style="opacity:.4;pointer-events:none;cursor:not-allowed;" title="Bientot disponible">CRM commandes</a>|g' partenariats.html

# Lien "Mon espace" → désactivé avec badge
sed -i 's|<a href="compta-partenaire\.html" class="btn-ghost">Mon espace</a>|<a href="compta-partenaire.html" class="btn-ghost" style="opacity:.4;pointer-events:none;cursor:not-allowed;" title="Bientot disponible">Mon espace</a>|g' partenariats.html

echo ""
echo "Verification..."
grep -n 'partenaire-crm\|compta-partenaire' partenariats.html | head -10

echo ""
echo "OK - Les liens sont desactives visuellement."
echo "Les pages coming-soon redirigent vers partenariats.html#contact si quelqu'un y accede directement."
echo ""
echo "Pusher avec :"
echo "  git add partenariats.html partenaire-crm.html compta-partenaire.html"
echo "  git commit -m 'feat: pages partenaire en mode coming soon'"
echo "  git push"
