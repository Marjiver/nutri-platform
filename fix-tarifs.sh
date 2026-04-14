#!/bin/bash
# =============================================================
# fix-tarifs.sh — NutriDoc · Corrections tarifaires ciblées
# Cible 4 fichiers avec des remplacements précis
# À exécuter depuis la RACINE de nutri-platform/
# =============================================================

echo "NutriDoc — Corrections tarifaires"
echo "==================================="
echo ""

# ── 1. compta-dieteticien.html ───────────────────────────────
# Commission Essentiel : 3.00 → 5.00 dans COMMISSIONS_SIM
echo "1/4 compta-dieteticien.html..."
sed -i 's/COMMISSIONS_SIM = { 0: 3\.00,/COMMISSIONS_SIM = { 0: 5.00,/' compta-dieteticien.html
# Vérification
grep 'COMMISSIONS_SIM' compta-dieteticien.html
echo ""

# ── 2. accueil-dieteticien.html ──────────────────────────────
# Commission Essentiel : COMMISSIONS={0:3, → COMMISSIONS={0:5,
echo "2/4 accueil-dieteticien.html..."
sed -i 's/COMMISSIONS={0:3,/COMMISSIONS={0:5,/' accueil-dieteticien.html
# Vérification
grep 'COMMISSIONS=' accueil-dieteticien.html | grep -o 'COMMISSIONS=[^;]*'
echo ""

# ── 3. supabase-schema.sql ───────────────────────────────────
# reversement DEFAULT 4900 → 4700 (visio : 47€ net diét.)
# commission_visio DEFAULT 4900 → 4700
echo "3/4 supabase-schema.sql..."
sed -i 's/reversement     int DEFAULT 4900/reversement     int DEFAULT 4700/' supabase-schema.sql
sed -i 's/commission_visio    int  DEFAULT 4900/commission_visio    int  DEFAULT 4700/' supabase-schema.sql
# Vérification
grep 'reversement\|commission_visio' supabase-schema.sql | grep 'DEFAULT'
echo ""

# ── 4. chatbot-widget.js ─────────────────────────────────────
# 49 € reversés → 47 € reversés
echo "4/4 chatbot-widget.js..."
sed -i 's/49 . revers/47 \u00e9 revers/' chatbot-widget.js
# Alternative si encoding pose problème
sed -i 's/dont 49/dont 47/' chatbot-widget.js
# Vérification
grep 'revers' chatbot-widget.js
echo ""

# ── VÉRIFICATION GLOBALE ─────────────────────────────────────
echo "==================================="
echo "VERIFICATION FINALE"
echo "==================================="

ERREURS=0

# Vérifier qu'il ne reste plus de 3.00 dans COMMISSIONS_SIM
if grep -q 'COMMISSIONS_SIM = { 0: 3' compta-dieteticien.html 2>/dev/null; then
  echo "ERREUR : compta-dieteticien.html — commission Essentiel toujours à 3€"
  ERREURS=$((ERREURS+1))
else
  echo "OK : compta-dieteticien.html — commission Essentiel = 5€"
fi

if grep -q 'COMMISSIONS={0:3,' accueil-dieteticien.html 2>/dev/null; then
  echo "ERREUR : accueil-dieteticien.html — commission Essentiel toujours à 3€"
  ERREURS=$((ERREURS+1))
else
  echo "OK : accueil-dieteticien.html — commission Essentiel = 5€"
fi

if grep -q 'DEFAULT 4900' supabase-schema.sql 2>/dev/null; then
  echo "ERREUR : supabase-schema.sql — DEFAULT 4900 toujours présent"
  grep -n 'DEFAULT 4900' supabase-schema.sql
  ERREURS=$((ERREURS+1))
else
  echo "OK : supabase-schema.sql — reversement = 4700 (47€)"
fi

echo ""
if [ "$ERREURS" -eq 0 ]; then
  echo "SUCCES — Toutes les corrections appliquées."
  echo ""
  echo "Étape suivante :"
  echo "  git add js/payments/stripe.js js/core/constants.js"
  echo "  git add compta-dieteticien.html accueil-dieteticien.html"
  echo "  git add supabase-schema.sql js/ui/chatbot-widget.js"
  echo "  git commit -m 'fix: harmonisation modele tarifaire'"
  echo "  git push"
else
  echo "ATTENTION : $ERREURS correction(s) ont echoue. Relis les lignes ERREUR ci-dessus."
fi
