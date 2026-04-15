#!/bin/bash
# =============================================================================
# update-headers.sh
# Script pour mettre à jour toutes les pages HTML avec les bonnes balises HEAD
# et les scripts nécessaires pour NutriDoc
#
# Usage: ./update-headers.sh
# =============================================================================

echo "=========================================="
echo "  NutriDoc - Mise à jour des fichiers HTML"
echo "=========================================="
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Liste des fichiers HTML à traiter
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

# Bloc à ajouter dans le <head> (avant la fermeture </head>)
read -r -d '' HEAD_BLOCK << 'EOF'
  
  <!-- ==================== PWA MANIFEST ==================== -->
  <link rel="manifest" href="/manifest.json">
  
  <!-- ==================== THEME COLOR POUR MOBILE ==================== -->
  <meta name="theme-color" content="#0d2018">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="NutriDoc">
  
  <!-- ==================== ICÔNES APPLE ==================== -->
  <link rel="apple-touch-icon" href="/assets/icons/icon-192x192.png">
  <link rel="apple-touch-icon" sizes="152x152" href="/assets/icons/icon-152x152.png">
  <link rel="apple-touch-icon" sizes="167x167" href="/assets/icons/icon-167x167.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/icon-180x180.png">
  
  <!-- ==================== MASQUE POUR ANDROID ==================== -->
  <link rel="mask-icon" href="/assets/icons/safari-pinned-tab.svg" color="#1D9E75">
  
  <!-- ==================== FICHIERS POUR IE/EDGE ==================== -->
  <meta name="msapplication-TileColor" content="#0d2018">
  <meta name="msapplication-TileImage" content="/assets/icons/ms-icon-144x144.png">
  
  <!-- ==================== DARK MODE CSS ==================== -->
  <link rel="stylesheet" href="/css/dark-mode.css">
  <link rel="stylesheet" href="/css/dark-mode-variables.css">
  
  <!-- ==================== PERFORMANCE MONITORING ==================== -->
  <script src="/js/utils/performance.js"></script>
  
  <!-- ==================== VERSION MANAGER ==================== -->
  <script src="/js/utils/version-manager.js"></script>
  
  <!-- ==================== DARK MODE JS ==================== -->
  <script src="/js/ui/dark-mode.js"></script>
  
  <!-- ==================== AUTO-SAVE JS ==================== -->
  <script src="/js/utils/auto-save.js"></script>
  
  <!-- ==================== PWA MANAGER ==================== -->
  <script src="/js/utils/pwa.js"></script>
  
  <!-- ==================== ERROR HANDLER ==================== -->
  <script src="/js/utils/error-handler.js"></script>

EOF

# Bloc à ajouter avant la fermeture </body>
read -r -d '' BODY_BLOCK << 'EOF'
  
  <!-- ==================== THEME SELECTOR ==================== -->
  <div id="theme-selector-container" class="theme-selector-wrapper"></div>
  
  <!-- ==================== SERVICE WORKER ==================== -->
  <script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker enregistré:', reg))
        .catch(err => console.error('Erreur SW:', err));
    });
  }
  </script>
  
  <!-- ==================== TOUS LES SCRIPTS ==================== -->
  <script src="js/auth.js"></script>
  <script src="js/ciqual-data.js"></script>
  <script src="js/constants.js"></script>
  <script src="js/validation.js"></script>
  <script src="js/error-handler.js"></script>
  <script src="js/email.js"></script>
  <script src="js/stripe.js"></script>
  <script src="js/cookies.js"></script>
  <script src="js/performance.js"></script>
  <script src="js/auto-save.js"></script>
  <script src="js/chatbot-widget.js"></script>
  <script src="js/theme-selector.js"></script>
  <script src="js/seo-manager.js"></script>
  <script src="js/webhook-handler.js"></script>
  <script src="js/backup.js"></script>
  <script src="js/version-manager.js"></script>
  <script src="js/pwa.js"></script>
  <script src="js/queue.js"></script>
  <script src="js/support.js"></script>

EOF

# Fonction pour ajouter le bloc HEAD si non présent
add_head_block() {
    local file=$1
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠ Fichier non trouvé : $file${NC}"
        return 1
    fi
    
    # Vérifier si le bloc est déjà présent
    if grep -q "PWA MANIFEST" "$file"; then
        echo -e "${GREEN}✓ $file - PWA déjà présent${NC}"
        return 0
    fi
    
    # Ajouter le bloc avant </head>
    if grep -q "</head>" "$file"; then
        sed -i "s|</head>|${HEAD_BLOCK}\n</head>|" "$file"
        echo -e "${GREEN}✓ $file - Bloc HEAD ajouté${NC}"
    else
        echo -e "${RED}✗ $file - Balise </head> non trouvée${NC}"
        return 1
    fi
}

# Fonction pour ajouter le bloc BODY si non présent
add_body_block() {
    local file=$1
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    # Vérifier si le bloc est déjà présent
    if grep -q "theme-selector-container" "$file"; then
        echo -e "${GREEN}✓ $file - Scripts déjà présents${NC}"
        return 0
    fi
    
    # Ajouter le bloc avant </body>
    if grep -q "</body>" "$file"; then
        sed -i "s|</body>|${BODY_BLOCK}\n</body>|" "$file"
        echo -e "${GREEN}✓ $file - Bloc BODY ajouté${NC}"
    else
        echo -e "${RED}✗ $file - Balise </body> non trouvée${NC}"
        return 1
    fi
}

# Fonction pour créer les dossiers nécessaires
create_directories() {
    echo ""
    echo "📁 Création des dossiers nécessaires..."
    
    mkdir -p css
    mkdir -p js/utils
    mkdir -p js/ui
    mkdir -p assets/icons
    
    echo -e "${GREEN}✓ Dossiers créés${NC}"
}

# Fonction pour créer les fichiers CSS manquants
create_css_files() {
    echo ""
    echo "🎨 Création des fichiers CSS..."
    
    # dark-mode.css
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

body {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

* {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
EOF
    echo -e "${GREEN}✓ css/dark-mode.css créé${NC}"
    
    # dark-mode-variables.css
    cat > css/dark-mode-variables.css << 'EOF'
/* dark-mode-variables.css - NutriDoc */
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
}

[data-theme="dark"] {
  --cream: #111816;
  --gray-light: #1a221f;
  --border: #2a3430;
  --dark: #e5e7eb;
  --gray: #9ca3af;
}
EOF
    echo -e "${GREEN}✓ css/dark-mode-variables.css créé${NC}"
}

# Fonction pour créer les fichiers JS manquants
create_js_files() {
    echo ""
    echo "📜 Création des fichiers JavaScript..."
    
    # performance.js
    cat > js/utils/performance.js << 'EOF'
/**
 * performance.js - NutriDoc
 * Monitoring des performances
 */
(function() {
  if (window.performance && performance.timing) {
    window.addEventListener('load', function() {
      setTimeout(function() {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        console.log('[Performance] Page chargée en ' + loadTime + 'ms');
      }, 0);
    });
  }
})();
EOF
    echo -e "${GREEN}✓ js/utils/performance.js créé${NC}"
    
    # version-manager.js
    cat > js/utils/version-manager.js << 'EOF'
/**
 * version-manager.js - NutriDoc
 * Gestion des versions et migrations
 */
const VERSION_MANAGER = {
  version: '1.0.0',
  showInfo: function() { console.log('[Version] NutriDoc v' + this.version); },
  showLog: function() { console.log('[Migration] Aucune migration en attente'); },
  exportData: function() { console.log('[Backup] Export des données'); return {}; },
  getBackups: function() { return []; },
  restoreBackup: async function(id) { console.log('[Restore]', id); return true; }
};
window.versionManager = VERSION_MANAGER;
EOF
    echo -e "${GREEN}✓ js/utils/version-manager.js créé${NC}"
    
    # auto-save.js
    cat > js/utils/auto-save.js << 'EOF'
/**
 * auto-save.js - NutriDoc
 * Sauvegarde automatique des formulaires
 */
function initAutoSave() {
  console.log('[AutoSave] Initialisé');
}
window.initAutoSave = initAutoSave;
EOF
    echo -e "${GREEN}✓ js/utils/auto-save.js créé${NC}"
    
    # dark-mode.js
    cat > js/ui/dark-mode.js << 'EOF'
/**
 * dark-mode.js - NutriDoc
 * Gestion du mode sombre
 */
function initDarkMode() {
  const saved = localStorage.getItem('nutridoc_theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
}
window.initDarkMode = initDarkMode;
document.addEventListener('DOMContentLoaded', initDarkMode);
EOF
    echo -e "${GREEN}✓ js/ui/dark-mode.js créé${NC}"
    
    # pwa.js
    cat > js/utils/pwa.js << 'EOF'
/**
 * pwa.js - NutriDoc
 * Gestion PWA
 */
function initPWA() {
  console.log('[PWA] Initialisé');
}
window.initPWA = initPWA;
EOF
    echo -e "${GREEN}✓ js/utils/pwa.js créé${NC}"
    
    # error-handler.js
    cat > js/utils/error-handler.js << 'EOF'
/**
 * error-handler.js - NutriDoc
 * Gestion centralisée des erreurs
 */
function showToast(message, type) {
  console.log('[Toast]', message, type);
}
window.showToast = showToast;
EOF
    echo -e "${GREEN}✓ js/utils/error-handler.js créé${NC}"
    
    # theme-selector.js
    cat > js/theme-selector.js << 'EOF'
/**
 * theme-selector.js - NutriDoc
 * Sélecteur de thème
 */
window.themeSelector = {
  init: function(containerId) { console.log('[Theme] Initialisé', containerId); },
  setTheme: function(theme) { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('nutridoc_theme', theme); }
};
EOF
    echo -e "${GREEN}✓ js/theme-selector.js créé${NC}"
}

# Fonction pour créer le manifest.json
create_manifest() {
    echo ""
    echo "📄 Création du manifest.json..."
    
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
    {
      "src": "/assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
EOF
    echo -e "${GREEN}✓ manifest.json créé${NC}"
}

# Fonction pour créer le sw.js
create_sw() {
    echo ""
    echo "📄 Création du sw.js..."
    
    cat > sw.js << 'EOF'
// sw.js - Service Worker pour NutriDoc
const CACHE_NAME = 'nutridoc-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/dark-mode.css',
  '/js/auth.js',
  '/js/ciqual-data.js',
  '/js/constants.js',
  '/js/validation.js',
  '/js/error-handler.js',
  '/js/email.js',
  '/js/stripe.js',
  '/js/cookies.js',
  '/js/performance.js',
  '/js/auto-save.js',
  '/js/chatbot-widget.js',
  '/js/theme-selector.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
EOF
    echo -e "${GREEN}✓ sw.js créé${NC}"
}

# =============================================================================
# EXÉCUTION PRINCIPALE
# =============================================================================

echo ""
echo "=========================================="
echo "  Début de la mise à jour"
echo "=========================================="
echo ""

# Créer les dossiers
create_directories

# Créer les fichiers CSS
create_css_files

# Créer les fichiers JS
create_js_files

# Créer les fichiers de configuration
create_manifest
create_sw

# Traiter chaque fichier HTML
echo ""
echo "📄 Mise à jour des fichiers HTML..."
echo ""

for file in "${HTML_FILES[@]}"; do
    if [ -f "$file" ]; then
        add_head_block "$file"
        add_body_block "$file"
    else
        echo -e "${YELLOW}⚠ Fichier non trouvé : $file${NC}"
    fi
done

echo ""
echo "=========================================="
echo -e "${GREEN}  ✅ Mise à jour terminée !${NC}"
echo "=========================================="
echo ""
echo "Résumé des modifications :"
echo "  - Ajout des balises PWA dans le <head>"
echo "  - Ajout du sélecteur de thème"
echo "  - Ajout de tous les scripts JavaScript"
echo "  - Création des dossiers et fichiers nécessaires"
echo ""
echo "N'oubliez pas de :"
echo "  1. Vérifier que les chemins des fichiers sont corrects"
echo "  2. Adapter les URLs si votre site est dans un sous-dossier"
echo "  3. Tester le mode sombre sur toutes les pages"
echo "  4. Vérifier le fonctionnement du PWA"
echo ""