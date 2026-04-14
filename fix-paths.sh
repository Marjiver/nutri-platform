#!/bin/bash
# =============================================================
# fix-paths.sh — NutriDoc · Correction des chemins CSS/JS
# Adapté à la structure RÉELLE du projet :
#   css/          → admin.css, dark-mode.css, home.css, style.css...
#   js/core/      → auth.js, constants.js, validation.js, ciqual-data.js
#   js/ui/        → cookies.js, nav.js, dark-mode.js, home.js...
#   js/utils/     → auto-save.js, email.js, performance.js, pdf-plan.js...
#   js/features/  → bilan.js, dashboard.js, dietitian.js...
#   js/forms/     → inscription-dieteticien.js, inscription-prescripteur.js
#   js/payments/  → stripe.js
#   js/admin/     → admin.js, admin-auth.js
#   js/legacy/    → main.js, dossier-patient.js
#   js/modules/   → partenaires.js
# À exécuter depuis la RACINE de nutri-platform/
# =============================================================

echo "NutriDoc — Correction des chemins CSS/JS"
echo "=========================================="
echo ""

HTML_COUNT=$(ls *.html 2>/dev/null | wc -l)
echo "$HTML_COUNT fichiers HTML detectes"
echo ""

# ── ÉTAPE 1 : Supprimer le slash initial sur les chemins absolus ──
echo "Etape 1 : Suppression des slashes initiaux..."
sed -i 's|href="/css/|href="css/|g' *.html
sed -i 's|src="/js/|src="js/|g' *.html
echo "OK : /css/ et /js/ corriges"
echo ""

# ── ÉTAPE 2 : Corriger les JS flat vers le bon sous-dossier ──────
echo "Etape 2 : Remise en place des sous-dossiers JS..."

# js/core/
sed -i 's|src="js/auth\.js"|src="js/core/auth.js"|g' *.html
sed -i 's|src="js/constants\.js"|src="js/core/constants.js"|g' *.html
sed -i 's|src="js/validation\.js"|src="js/core/validation.js"|g' *.html
sed -i 's|src="js/ciqual-data\.js"|src="js/core/ciqual-data.js"|g' *.html
echo "  OK js/core/"

# js/ui/
sed -i 's|src="js/cookies\.js"|src="js/ui/cookies.js"|g' *.html
sed -i 's|src="js/nav\.js"|src="js/ui/nav.js"|g' *.html
sed -i 's|src="js/dark-mode\.js"|src="js/ui/dark-mode.js"|g' *.html
sed -i 's|src="js/home\.js"|src="js/ui/home.js"|g' *.html
sed -i 's|src="js/chatbot-widget\.js"|src="js/ui/chatbot-widget.js"|g' *.html
sed -i 's|src="js/theme-selector\.js"|src="js/ui/theme-selector.js"|g' *.html
sed -i 's|src="js/support\.js"|src="js/ui/support.js"|g' *.html
sed -i 's|src="js/quiz\.js"|src="js/ui/quiz.js"|g' *.html
echo "  OK js/ui/"

# js/utils/
sed -i 's|src="js/auto-save\.js"|src="js/utils/auto-save.js"|g' *.html
sed -i 's|src="js/email\.js"|src="js/utils/email.js"|g' *.html
sed -i 's|src="js/performance\.js"|src="js/utils/performance.js"|g' *.html
sed -i 's|src="js/pdf-plan\.js"|src="js/utils/pdf-plan.js"|g' *.html
sed -i 's|src="js/error-handler\.js"|src="js/utils/error-handler.js"|g' *.html
sed -i 's|src="js/pwa\.js"|src="js/utils/pwa.js"|g' *.html
sed -i 's|src="js/version-manager\.js"|src="js/utils/version-manager.js"|g' *.html
sed -i 's|src="js/backup\.js"|src="js/utils/backup.js"|g' *.html
sed -i 's|src="js/export-csv\.js"|src="js/utils/export-csv.js"|g' *.html
sed -i 's|src="js/queue\.js"|src="js/utils/queue.js"|g' *.html
sed -i 's|src="js/seo-manager\.js"|src="js/utils/seo-manager.js"|g' *.html
sed -i 's|src="js/webhook-handler\.js"|src="js/utils/webhook-handler.js"|g' *.html
echo "  OK js/utils/"

# js/features/
sed -i 's|src="js/bilan\.js"|src="js/features/bilan.js"|g' *.html
sed -i 's|src="js/dashboard\.js"|src="js/features/dashboard.js"|g' *.html
sed -i 's|src="js/dietitian\.js"|src="js/features/dietitian.js"|g' *.html
sed -i 's|src="js/prescripteur-crm\.js"|src="js/features/prescripteur-crm.js"|g' *.html
sed -i 's|src="js/prescripteur-dashboard\.js"|src="js/features/prescripteur-dashboard.js"|g' *.html
echo "  OK js/features/"

# js/forms/
sed -i 's|src="js/inscription-dieteticien\.js"|src="js/forms/inscription-dieteticien.js"|g' *.html
sed -i 's|src="js/inscription-prescripteur\.js"|src="js/forms/inscription-prescripteur.js"|g' *.html
echo "  OK js/forms/"

# js/payments/
sed -i 's|src="js/stripe\.js"|src="js/payments/stripe.js"|g' *.html
echo "  OK js/payments/"

# js/admin/
sed -i 's|src="js/admin\.js"|src="js/admin/admin.js"|g' *.html
sed -i 's|src="js/admin-auth\.js"|src="js/admin/admin-auth.js"|g' *.html
echo "  OK js/admin/"

# js/legacy/
sed -i 's|src="js/main\.js"|src="js/legacy/main.js"|g' *.html
sed -i 's|src="js/dossier-patient\.js"|src="js/legacy/dossier-patient.js"|g' *.html
echo "  OK js/legacy/"

# js/modules/
sed -i 's|src="js/partenaires\.js"|src="js/modules/partenaires.js"|g' *.html
echo "  OK js/modules/"

echo ""

# ── ÉTAPE 3 : VÉRIFICATION ───────────────────────────────────────
echo "Etape 3 : Verification..."
echo ""

SLASH_REMAIN=$(grep -rn 'href="/css/\|src="/js/' *.html 2>/dev/null | wc -l)
JS_FLAT=$(grep -rn 'src="js/[a-z]' *.html 2>/dev/null | grep -v 'src="js/core/\|src="js/ui/\|src="js/utils/\|src="js/features/\|src="js/forms/\|src="js/payments/\|src="js/admin/\|src="js/legacy/\|src="js/modules/\|src="js/sw' | wc -l)

if [ "$SLASH_REMAIN" -eq 0 ] && [ "$JS_FLAT" -eq 0 ]; then
  echo "SUCCES - Aucun chemin casse restant !"
else
  [ "$SLASH_REMAIN" -gt 0 ] && echo "ATTENTION - Slashes initiaux restants : $SLASH_REMAIN" && grep -rn 'href="/css/\|src="/js/' *.html 2>/dev/null
  [ "$JS_FLAT" -gt 0 ] && echo "ATTENTION - JS flat non corriges : $JS_FLAT" && grep -rn 'src="js/[a-z]' *.html 2>/dev/null | grep -v 'src="js/core/\|src="js/ui/\|src="js/utils/\|src="js/features/\|src="js/forms/\|src="js/payments/\|src="js/admin/\|src="js/legacy/\|src="js/modules/\|src="js/sw'
fi

echo ""
echo "Script termine. Si SUCCES, lance : git add -A && git commit -m 'fix: correction chemins CSS/JS' && git push"
