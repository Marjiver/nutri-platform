#!/bin/bash
# =============================================================================
# update-all-files.sh
# Script pour METTRE À JOUR tous les fichiers HTML, CSS, JS sans les écraser
# Ajoute uniquement les balises manquantes (PWA, dark mode, scripts, etc.)
#
# Usage: ./update-all-files.sh
# =============================================================================

echo "=========================================="
echo "  NutriDoc - Mise à jour de tous les fichiers"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# =============================================================================
# 1. CRÉATION DES DOSSIERS (si inexistants)
# =============================================================================
echo -e "${YELLOW}📁 Vérification des dossiers...${NC}"
mkdir -p css
mkdir -p js/utils
mkdir -p js/ui
mkdir -p assets/icons
echo -e "${GREEN}✓ Dossiers vérifiés/créés${NC}"

# =============================================================================
# 2. CRÉATION DES FICHIERS CSS (seulement s'ils n'existent pas)
# =============================================================================
echo ""
echo -e "${YELLOW}🎨 Vérification des fichiers CSS...${NC}"

if [ ! -f "css/style.css" ]; then
    cat > css/style.css << 'EOF'
/* style.css - NutriDoc */
:root {
  --green: #1D9E75;
  --green2: #0f6e56;
  --green3: #5DCAA5;
  --green-light: #E1F5EE;
  --cream: #f7f9f7;
  --dark: #0d2018;
  --gray: #6b7280;
  --gray-light: #f3f4f6;
  --border: #e5e7eb;
  --radius: 12px;
  --radius-sm: 8px;
  
  --bg-primary: #ffffff;
  --bg-secondary: #f7f9f7;
  --bg-card: #ffffff;
  --bg-input: #ffffff;
  --bg-tertiary: #eef4ee;
  --text-primary: #0d2018;
  --text-secondary: #4b5563;
  --border-color: #e5e7eb;
}

[data-theme="dark"] {
  --bg-primary: #0a0f0d;
  --bg-secondary: #111816;
  --bg-card: #141c19;
  --bg-input: #1a221f;
  --bg-tertiary: #1a221f;
  --text-primary: #e5e7eb;
  --text-secondary: #9ca3af;
  --border-color: #2a3430;
  --cream: #111816;
  --gray-light: #1a221f;
  --border: #2a3430;
  --dark: #e5e7eb;
  --gray: #9ca3af;
}

body {
  font-family: 'Outfit', sans-serif;
  background: var(--bg-secondary);
  color: var(--text-primary);
  line-height: 1.5;
  transition: background-color 0.2s ease, color 0.2s ease;
}

* {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
EOF
    echo -e "${GREEN}✓ css/style.css créé${NC}"
else
    echo -e "${BLUE}→ css/style.css existe déjà, conservé${NC}"
fi

if [ ! -f "css/dark-mode.css" ]; then
    cat > css/dark-mode.css << 'EOF'
/* dark-mode.css - NutriDoc */
[data-theme="dark"] {
  --bg-primary: #0a0f0d;
  --bg-secondary: #111816;
  --bg-card: #141c19;
  --bg-input: #1a221f;
  --text-primary: #e5e7eb;
  --text-secondary: #9ca3af;
  --border-color: #2a3430;
}
EOF
    echo -e "${GREEN}✓ css/dark-mode.css créé${NC}"
else
    echo -e "${BLUE}→ css/dark-mode.css existe déjà, conservé${NC}"
fi

# =============================================================================
# 3. CRÉATION DES FICHIERS JS (seulement s'ils n'existent pas)
# =============================================================================
echo ""
echo -e "${YELLOW}📜 Vérification des fichiers JavaScript...${NC}"

if [ ! -f "js/theme-selector.js" ]; then
    cat > js/theme-selector.js << 'EOF'
window.themeSelector = {
  init: function(containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    const btn = document.createElement('button');
    btn.id = 'themeFloatingButton';
    btn.innerHTML = localStorage.getItem('nutridoc_theme') === 'dark' ? '☀️' : '🌙';
    btn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:52px;height:52px;border-radius:50%;background:#1D9E75;color:#fff;border:none;cursor:pointer;font-size:24px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
    btn.onclick = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if(isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('nutridoc_theme', 'light');
        btn.innerHTML = '🌙';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('nutridoc_theme', 'dark');
        btn.innerHTML = '☀️';
      }
    };
    document.body.appendChild(btn);
  }
};
EOF
    echo -e "${GREEN}✓ js/theme-selector.js créé${NC}"
else
    echo -e "${BLUE}→ js/theme-selector.js existe déjà, conservé${NC}"
fi

if [ ! -f "js/error-handler.js" ]; then
    cat > js/error-handler.js << 'EOF'
function showToast(message, type) { console.log('[Toast]', message, type); }
window.showToast = showToast;
EOF
    echo -e "${GREEN}✓ js/error-handler.js créé${NC}"
else
    echo -e "${BLUE}→ js/error-handler.js existe déjà, conservé${NC}"
fi

if [ ! -f "js/performance.js" ]; then
    cat > js/performance.js << 'EOF'
(function() {
  window.addEventListener('load', function() {
    setTimeout(function() {
      const timing = performance.timing;
      if(timing) console.log('[Performance] Page chargée en ' + (timing.loadEventEnd - timing.navigationStart) + 'ms');
    }, 0);
  });
})();
EOF
    echo -e "${GREEN}✓ js/performance.js créé${NC}"
else
    echo -e "${BLUE}→ js/performance.js existe déjà, conservé${NC}"
fi

if [ ! -f "js/auto-save.js" ]; then
    cat > js/auto-save.js << 'EOF'
function initAutoSave() { console.log('[AutoSave] Initialisé'); }
window.initAutoSave = initAutoSave;
EOF
    echo -e "${GREEN}✓ js/auto-save.js créé${NC}"
else
    echo -e "${BLUE}→ js/auto-save.js existe déjà, conservé${NC}"
fi

# =============================================================================
# 4. CRÉATION DE manifest.json ET sw.js (seulement s'ils n'existent pas)
# =============================================================================
echo ""
echo -e "${YELLOW}📄 Vérification des fichiers de configuration...${NC}"

if [ ! -f "manifest.json" ]; then
    cat > manifest.json << 'EOF'
{
  "name": "NutriDoc",
  "short_name": "NutriDoc",
  "description": "Plateforme nutritionnelle certifiée",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0d2018",
  "background_color": "#0d2018",
  "icons": [
    { "src": "/assets/icons/icon-72x72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/assets/icons/icon-96x96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "/assets/icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/assets/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "/assets/icons/icon-152x152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/assets/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icons/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/assets/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
EOF
    echo -e "${GREEN}✓ manifest.json créé${NC}"
else
    echo -e "${BLUE}→ manifest.json existe déjà, conservé${NC}"
fi

if [ ! -f "sw.js" ]; then
    cat > sw.js << 'EOF'
const CACHE_NAME = 'nutridoc-v1';
const urlsToCache = [
  '/', '/index.html', '/accueil-dieteticien.html', '/accueil-prescripteur.html',
  '/css/style.css', '/css/dark-mode.css', '/js/auth.js', '/js/ciqual-data.js',
  '/js/constants.js', '/js/validation.js', '/js/error-handler.js', '/js/email.js',
  '/js/stripe.js', '/js/cookies.js', '/js/performance.js', '/js/auto-save.js',
  '/js/chatbot-widget.js', '/js/theme-selector.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(cacheNames => Promise.all(
    cacheNames.map(cacheName => cacheName !== CACHE_NAME && caches.delete(cacheName))
  )));
});
EOF
    echo -e "${GREEN}✓ sw.js créé${NC}"
else
    echo -e "${BLUE}→ sw.js existe déjà, conservé${NC}"
fi

# =============================================================================
# 5. FONCTION POUR METTRE À JOUR UN FICHIER HTML
# =============================================================================
update_html_file() {
    local file=$1
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ $file n'existe pas${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}📄 Mise à jour de $file...${NC}"
    local modified=0
    
    # 1. Ajouter les balises PWA manquantes dans <head>
    if ! grep -q "apple-mobile-web-app-capable" "$file"; then
        sed -i 's|<head>|<head>\n  <!-- PWA -->\n  <link rel="manifest" href="/manifest.json">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n  <meta name="apple-mobile-web-app-title" content="NutriDoc">\n  <link rel="apple-touch-icon" href="/assets/icons/icon-192x192.png">|' "$file"
        modified=1
        echo -e "  ✓ Balises PWA ajoutées"
    fi
    
    # 2. Ajouter le thème color
    if ! grep -q 'name="theme-color"' "$file"; then
        sed -i 's|<head>|<head>\n  <meta name="theme-color" content="#0d2018">|' "$file"
        modified=1
        echo -e "  ✓ theme-color ajouté"
    fi
    
    # 3. Ajouter les liens CSS
    if ! grep -q 'css/style.css' "$file"; then
        sed -i 's|</head>|  <link rel="stylesheet" href="css/style.css">\n  <link rel="stylesheet" href="css/dark-mode.css">\n</head>|' "$file"
        modified=1
        echo -e "  ✓ CSS ajoutés"
    fi
    
    # 4. Ajouter le conteneur theme-selector avant </body>
    if ! grep -q 'theme-selector-container' "$file"; then
        sed -i 's|</body>|  <div id="theme-selector-container" class="theme-selector-wrapper"></div>\n</body>|' "$file"
        modified=1
        echo -e "  ✓ theme-selector-container ajouté"
    fi
    
    # 5. Ajouter theme-selector.js si manquant
    if ! grep -q 'theme-selector.js' "$file"; then
        sed -i 's|</body>|  <script src="js/theme-selector.js"></script>\n</body>|' "$file"
        modified=1
        echo -e "  ✓ theme-selector.js ajouté"
    fi
    
    # 6. Ajouter error-handler.js si manquant
    if ! grep -q 'error-handler.js' "$file"; then
        sed -i 's|</body>|  <script src="js/error-handler.js"></script>\n</body>|' "$file"
        modified=1
        echo -e "  ✓ error-handler.js ajouté"
    fi
    
    # 7. Ajouter performance.js si manquant
    if ! grep -q 'performance.js' "$file"; then
        sed -i 's|</body>|  <script src="js/performance.js"></script>\n</body>|' "$file"
        modified=1
        echo -e "  ✓ performance.js ajouté"
    fi
    
    # 8. Ajouter auto-save.js si manquant
    if ! grep -q 'auto-save.js' "$file"; then
        sed -i 's|</body>|  <script src="js/auto-save.js"></script>\n</body>|' "$file"
        modified=1
        echo -e "  ✓ auto-save.js ajouté"
    fi
    
    # 9. Ajouter le Service Worker
    if ! grep -q 'serviceWorker' "$file"; then
        sed -i 's|</body>|  <script>\n  if ("serviceWorker" in navigator) {\n    window.addEventListener("load", () => {\n      navigator.serviceWorker.register("/sw.js")\n        .then(reg => console.log("Service Worker enregistré:", reg))\n        .catch(err => console.error("Erreur SW:", err));\n    });\n  }\n  </script>\n</body>|' "$file"
        modified=1
        echo -e "  ✓ Service Worker ajouté"
    fi
    
    if [ $modified -eq 0 ]; then
        echo -e "  ${BLUE}→ Aucune modification nécessaire${NC}"
    else
        echo -e "  ${GREEN}✓ Mise à jour terminée${NC}"
    fi
}

# =============================================================================
# 6. LISTE DES FICHIERS HTML À METTRE À JOUR
# =============================================================================
echo ""
echo -e "${YELLOW}📄 Mise à jour des fichiers HTML...${NC}"
echo ""

HTML_FILES=(
    "index.html"
    "accueil-dieteticien.html"
    "accueil-prescripteur.html"
    "bilan.html"
    "dashboard.html"
    "dietitian.html"
    "prescripteur-dashboard.html"
    "prescripteur-crm.html"
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

for file in "${HTML_FILES[@]}"; do
    if [ -f "$file" ]; then
        update_html_file "$file"
    else
        echo -e "${RED}✗ $file n'existe pas (ignoré)${NC}"
    fi
done

# =============================================================================
# 7. MISE À JOUR SPÉCIFIQUE POUR index.html (header et hero)
# =============================================================================
echo ""
echo -e "${YELLOW}🎨 Vérification spécifique de index.html...${NC}"

if [ -f "index.html" ]; then
    # Vérifier si le bouton theme est présent dans le header
    if ! grep -q 'themeHeaderBtn' "index.html"; then
        echo -e "${YELLOW}  ⚠ Bouton mode sombre manquant dans le header de index.html${NC}"
        echo -e "  ${BLUE}→ Ajoutez-le manuellement ou conservez votre version${NC}"
    else
        echo -e "${GREEN}  ✓ Bouton mode sombre présent${NC}"
    fi
fi

# =============================================================================
# 8. RÉCAPITULATIF
# =============================================================================
echo ""
echo "=========================================="
echo -e "${GREEN}  ✅ Mise à jour terminée !${NC}"
echo "=========================================="
echo ""
echo "Résumé :"
echo "  ✓ Dossiers vérifiés/créés"
echo "  ✓ Fichiers CSS créés uniquement si absents"
echo "  ✓ Fichiers JS créés uniquement si absents"
echo "  ✓ manifest.json et sw.js créés uniquement si absents"
echo "  ✓ Tous les fichiers HTML existants ont été mis à jour"
echo ""
echo "Fichiers HTML modifiés :"
for file in "${HTML_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  - $file"
    fi
done
echo ""
echo "⚠  Note : Les fichiers existants ont été préservés,"
echo "   seules les balises manquantes ont été ajoutées."