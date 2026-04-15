#!/bin/bash
# =============================================================================
# add-seo-tags.sh
# Ajoute les balises SEO à toutes les pages HTML
# =============================================================================

echo "=========================================="
echo "  NutriDoc - Ajout des balises SEO"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Définition des métadonnées SEO par page
declare -A PAGE_TITLES
declare -A PAGE_DESCRIPTIONS
declare -A PAGE_KEYWORDS
declare -A PAGE_OG_TITLES
declare -A PAGE_OG_DESCS
declare -A PAGE_CANONICAL

# Page d'accueil (patient)
PAGE_TITLES["index.html"]="NutriDoc — Plateforme nutritionnelle certifiée · CaliDoc Santé"
PAGE_DESCRIPTIONS["index.html"]="Bilan nutritionnel gratuit · Plan alimentaire avec grammages précis validé par un diététicien certifié RPPS. Perte de poids, prise de masse, performance sportive. Livré sous 48h."
PAGE_KEYWORDS["index.html"]="nutrition, bilan nutritionnel, plan alimentaire, diététicien, perte de poids, prise de masse, coaching nutrition, RPPS"
PAGE_OG_TITLES["index.html"]="NutriDoc — Bilan nutritionnel gratuit"
PAGE_OG_DESCS["index.html"]="Bilan nutritionnel gratuit · Plan alimentaire personnalisé validé par un diététicien certifié RPPS"

# Page diététicien
PAGE_TITLES["accueil-dieteticien.html"]="NutriDoc — Espace Diététicien · Rejoignez la plateforme RPPS"
PAGE_DESCRIPTIONS["accueil-dieteticien.html"]="Diététicien certifié RPPS : générez des revenus complémentaires en validant des plans alimentaires depuis chez vous. 1 plan offert par mois."
PAGE_KEYWORDS["accueil-dieteticien.html"]="diététicien, RPPS, revenus complémentaires, validation plans, nutrition professionnelle"
PAGE_OG_TITLES["accueil-dieteticien.html"]="NutriDoc — Espace Diététicien"
PAGE_OG_DESCS["accueil-dieteticien.html"]="Devenez diététicien partenaire NutriDoc. Validez des plans alimentaires depuis chez vous."

# Page prescripteur
PAGE_TITLES["accueil-prescripteur.html"]="NutriDoc — Espace Prescripteur · Plans certifiés RPPS"
PAGE_DESCRIPTIONS["accueil-prescripteur.html"]="Prescrivez des plans alimentaires certifiés RPPS à vos clients. Médecin, kiné, coach sportif, ostéopathe — rejoignez NutriDoc avec votre SIRET."
PAGE_KEYWORDS["accueil-prescripteur.html"]="prescripteur, SIRET, plans alimentaires, médecin, kiné, coach sportif"
PAGE_OG_TITLES["accueil-prescripteur.html"]="NutriDoc — Espace Prescripteur"
PAGE_OG_DESCS["accueil-prescripteur.html"]="Proposez des plans nutritionnels validés par des diététiciens RPPS à vos clients."

# Page bilan
PAGE_TITLES["bilan.html"]="NutriDoc — Bilan nutritionnel gratuit en 5 minutes"
PAGE_DESCRIPTIONS["bilan.html"]="Bilan nutritionnel gratuit en 5 minutes. Évaluez vos besoins, recevez des recommandations personnalisées et commandez votre plan alimentaire."
PAGE_KEYWORDS["bilan.html"]="bilan nutritionnel, diagnostic nutrition, évaluation gratuite"
PAGE_OG_TITLES["bilan.html"]="Bilan nutritionnel gratuit — NutriDoc"
PAGE_OG_DESCS["bilan.html"]="Faites votre bilan nutritionnel en ligne gratuitement en 5 minutes."

# Page dashboard patient
PAGE_TITLES["dashboard.html"]="NutriDoc — Mon tableau de bord patient"
PAGE_DESCRIPTIONS["dashboard.html"]="Accédez à votre tableau de bord NutriDoc : suivez vos progrès, consultez votre plan alimentaire et échangez avec votre diététicien."
PAGE_KEYWORDS["dashboard.html"]="dashboard patient, suivi nutritionnel, plan alimentaire"
PAGE_OG_TITLES["dashboard.html"]="Mon espace patient — NutriDoc"
PAGE_OG_DESCS["dashboard.html"]="Votre espace personnel NutriDoc pour suivre votre plan alimentaire."

# Page inscription diététicien
PAGE_TITLES["inscription-dieteticien.html"]="NutriDoc — Inscription diététicien certifié RPPS"
PAGE_DESCRIPTIONS["inscription-dieteticien.html"]="Inscrivez-vous gratuitement comme diététicien sur NutriDoc. Validez des plans alimentaires et générez des revenus complémentaires."
PAGE_KEYWORDS["inscription-dieteticien.html"]="inscription diététicien, devenir diététicien, RPPS"
PAGE_OG_TITLES["inscription-dieteticien.html"]="Inscription diététicien — NutriDoc"
PAGE_OG_DESCS["inscription-dieteticien.html"]="Rejoignez la plateforme NutriDoc comme diététicien certifié."

# Page inscription prescripteur
PAGE_TITLES["inscription-prescripteur.html"]="NutriDoc — Inscription prescripteur (médecin, kiné, coach)"
PAGE_DESCRIPTIONS["inscription-prescripteur.html"]="Inscrivez-vous comme prescripteur sur NutriDoc. Proposez des plans alimentaires certifiés à vos clients. SIRET obligatoire."
PAGE_KEYWORDS["inscription-prescripteur.html"]="inscription prescripteur, médecin nutrition, kiné, coach sportif"
PAGE_OG_TITLES["inscription-prescripteur.html"]="Inscription prescripteur — NutriDoc"
PAGE_OG_DESCS["inscription-prescripteur.html"]="Devenez prescripteur NutriDoc et proposez des plans alimentaires à vos clients."

# Page login
PAGE_TITLES["login.html"]="NutriDoc — Connexion à mon espace"
PAGE_DESCRIPTIONS["login.html"]="Connectez-vous à votre espace NutriDoc : patient, diététicien ou prescripteur."
PAGE_KEYWORDS["login.html"]="connexion, login, espace personnel"
PAGE_OG_TITLES["login.html"]="Connexion — NutriDoc"
PAGE_OG_DESCS["login.html"]="Accédez à votre compte NutriDoc."

# Page FAQ
PAGE_TITLES["faq.html"]="NutriDoc — Foire aux questions"
PAGE_DESCRIPTIONS["faq.html"]="Toutes les réponses à vos questions sur NutriDoc : fonctionnement, tarifs, légalité, inscription."
PAGE_KEYWORDS["faq.html"]="FAQ, questions, réponses, aide"
PAGE_OG_TITLES["faq.html"]="FAQ — NutriDoc"
PAGE_OG_DESCS["faq.html"]="Questions fréquentes sur NutriDoc."

# Page partenariats
PAGE_TITLES["partenariats.html"]="NutriDoc — Partenaires B2B · Nutrition pour entreprises"
PAGE_DESCRIPTIONS["partenariats.html"]="Devenez partenaire NutriDoc. Salles de sport, maisons de santé, entreprises, mutuelles. Proposez la nutrition à vos bénéficiaires."
PAGE_KEYWORDS["partenariats.html"]="partenariat B2B, entreprise, mutuelle, salle de sport"
PAGE_OG_TITLES["partenariats.html"]="Partenaires B2B — NutriDoc"
PAGE_OG_DESCS["partenariats.html"]="Proposez des plans alimentaires certifiés à vos bénéficiaires."

# Pages légales (valeurs par défaut)
PAGE_TITLES["cgu-patient.html"]="NutriDoc — Conditions générales d'utilisation (Patient)"
PAGE_TITLES["cgu-dieteticien.html"]="NutriDoc — Conditions générales d'utilisation (Diététicien)"
PAGE_TITLES["cgu-prescripteur.html"]="NutriDoc — Conditions générales d'utilisation (Prescripteur)"
PAGE_TITLES["politique-confidentialite.html"]="NutriDoc — Politique de confidentialité RGPD"
PAGE_TITLES["mentions-legales.html"]="NutriDoc — Mentions légales"

# Valeur par défaut pour les pages sans définition
DEFAULT_TITLE="NutriDoc — Plateforme nutritionnelle certifiée"
DEFAULT_DESCRIPTION="Bilan nutritionnel gratuit · Plan alimentaire personnalisé validé par un diététicien certifié RPPS."

# =============================================================================
# FONCTION POUR AJOUTER LES BALISES SEO
# =============================================================================
add_seo_tags() {
    local file=$1
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠ $file n'existe pas${NC}"
        return 1
    fi
    
    echo -e "${GREEN}📄 Ajout SEO à $file${NC}"
    
    # Récupérer les valeurs ou utiliser les défauts
    local title="${PAGE_TITLES[$file]:-$DEFAULT_TITLE}"
    local description="${PAGE_DESCRIPTIONS[$file]:-$DEFAULT_DESCRIPTION}"
    local keywords="${PAGE_KEYWORDS[$file]:-$DEFAULT_KEYWORDS}"
    local og_title="${PAGE_OG_TITLES[$file]:-$title}"
    local og_desc="${PAGE_OG_DESCS[$file]:-$description}"
    
    # Vérifier si les balises SEO existent déjà
    if grep -q 'name="description"' "$file"; then
        echo -e "  ${YELLOW}→ description déjà présente, mise à jour...${NC}"
        # Remplacer la description existante
        sed -i "s|<meta name=\"description\" content=\"[^\"]*\">|<meta name=\"description\" content=\"$description\">|" "$file"
    else
        # Ajouter la description après <head>
        sed -i "s|<head>|<head>\n  <meta name=\"description\" content=\"$description\">|" "$file"
        echo -e "  ✓ description ajoutée"
    fi
    
    # Vérifier les keywords
    if grep -q 'name="keywords"' "$file"; then
        sed -i "s|<meta name=\"keywords\" content=\"[^\"]*\">|<meta name=\"keywords\" content=\"$keywords\">|" "$file"
        echo -e "  ✓ keywords mises à jour"
    else
        sed -i "s|<head>|<head>\n  <meta name=\"keywords\" content=\"$keywords\">|" "$file"
        echo -e "  ✓ keywords ajoutées"
    fi
    
    # Vérifier author
    if ! grep -q 'name="author"' "$file"; then
        sed -i "s|<head>|<head>\n  <meta name=\"author\" content=\"CaliDoc Santé\">|" "$file"
        echo -e "  ✓ author ajouté"
    fi
    
    # Vérifier Open Graph title
    if grep -q 'property="og:title"' "$file"; then
        sed -i "s|<meta property=\"og:title\" content=\"[^\"]*\">|<meta property=\"og:title\" content=\"$og_title\">|" "$file"
    else
        sed -i "s|<head>|<head>\n  <meta property=\"og:title\" content=\"$og_title\">|" "$file"
        echo -e "  ✓ og:title ajouté"
    fi
    
    # Vérifier Open Graph description
    if grep -q 'property="og:description"' "$file"; then
        sed -i "s|<meta property=\"og:description\" content=\"[^\"]*\">|<meta property=\"og:description\" content=\"$og_desc\">|" "$file"
    else
        sed -i "s|<head>|<head>\n  <meta property=\"og:description\" content=\"$og_desc\">|" "$file"
        echo -e "  ✓ og:description ajouté"
    fi
    
    # Vérifier Open Graph type
    if ! grep -q 'property="og:type"' "$file"; then
        sed -i "s|<head>|<head>\n  <meta property=\"og:type\" content=\"website\">|" "$file"
        echo -e "  ✓ og:type ajouté"
    fi
    
    # Vérifier Open Graph url
    if ! grep -q 'property="og:url"' "$file"; then
        local page_name=$(basename "$file" .html)
        local og_url="https://nutridoc.calidoc-sante.fr/$page_name.html"
        sed -i "s|<head>|<head>\n  <meta property=\"og:url\" content=\"$og_url\">|" "$file"
        echo -e "  ✓ og:url ajouté"
    fi
    
    # Vérifier Twitter Card
    if ! grep -q 'twitter:card' "$file"; then
        sed -i "s|<head>|<head>\n  <meta property=\"twitter:card\" content=\"summary_large_image\">\n  <meta property=\"twitter:title\" content=\"$og_title\">\n  <meta property=\"twitter:description\" content=\"$og_desc\">|" "$file"
        echo -e "  ✓ Twitter Card ajoutée"
    fi
    
    # Mettre à jour le titre de la page
    if grep -q '<title>' "$file"; then
        sed -i "s|<title>.*</title>|<title>$title</title>|" "$file"
        echo -e "  ✓ titre mis à jour"
    fi
    
    echo -e "  ${GREEN}✓ SEO terminé pour $file${NC}"
    echo ""
}

# =============================================================================
# EXÉCUTION
# =============================================================================
echo ""
echo -e "${YELLOW}📊 Ajout des balises SEO...${NC}"
echo ""

FILES_TO_UPDATE=(
    "index.html"
    "accueil-dieteticien.html"
    "accueil-prescripteur.html"
    "bilan.html"
    "dashboard.html"
    "inscription-dieteticien.html"
    "inscription-prescripteur.html"
    "login.html"
    "faq.html"
    "partenariats.html"
    "cgu-patient.html"
    "cgu-dieteticien.html"
    "cgu-prescripteur.html"
    "politique-confidentialite.html"
    "mentions-legales.html"
)

for file in "${FILES_TO_UPDATE[@]}"; do
    if [ -f "$file" ]; then
        add_seo_tags "$file"
    else
        echo -e "${YELLOW}⚠ $file n'existe pas, création...${NC}"
        # Le fichier sera créé plus tard
    fi
done

echo ""
echo "=========================================="
echo -e "${GREEN}  ✅ SEO ajouté à toutes les pages !${NC}"
echo "=========================================="