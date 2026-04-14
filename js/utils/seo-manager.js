/**
 * seo-manager.js — NutriDoc · Gestion centralisée du SEO
 * 
 * Fonctionnalités :
 * - Gestion des métadonnées (title, description, keywords)
 * - Open Graph (Facebook, LinkedIn)
 * - Twitter Cards
 * - Données structurées JSON-LD (Schema.org)
 * - Sitemap.xml dynamique
 * - Robots.txt
 * - Analytics (GA4, GTM, Matomo)
 * - Audit SEO automatique
 * - Canonical URLs
 * - Hreflang (multilingue)
 * 
 * Dépendances : aucune (Vanilla JS)
 * 
 * Version: 1.0.0
 */

// ==================== CONFIGURATION ====================

const SEO_CONFIG = {
  // Configuration générale
  siteName: 'NutriDoc',
  siteUrl: 'https://nutridoc.calidoc-sante.fr',
  defaultLanguage: 'fr',
  supportedLanguages: ['fr', 'en'],
  
  // Métadonnées par défaut
  defaultTitle: 'NutriDoc — Plateforme nutritionnelle certifiée · CaliDoc Santé',
  defaultDescription: 'Bilan nutritionnel gratuit · Plan alimentaire avec grammages précis validé par un diététicien certifié RPPS. Perte de poids, prise de masse, performance sportive. Livré sous 48h.',
  defaultKeywords: ['nutrition', 'bilan nutritionnel', 'plan alimentaire', 'diététicien', 'perte de poids', 'prise de masse'],
  
  // Auteur
  author: 'CaliDoc Santé',
  
  // Images
  defaultImage: '/assets/images/og-image.jpg',
  defaultImageAlt: 'NutriDoc - Plateforme nutritionnelle certifiée',
  
  // Twitter
  twitterHandle: '@nutridoc',
  twitterSite: '@nutridoc',
  
  // Analytics
  ga4Id: null, // Sera chargé depuis localStorage
  gtmId: null,
  matomoUrl: null,
  
  // Stockage
  storageKey: 'nutridoc_seo_config'
};

// ==================== STRUCTURES ====================

/**
 * @typedef {Object} PageSEO
 * @property {string} path - Chemin de la page
 * @property {string} title - Titre personnalisé
 * @property {string} description - Description personnalisée
 * @property {string[]} keywords - Mots-clés spécifiques
 * @property {string} canonical - URL canonique
 * @property {Object} og - Open Graph spécifique
 * @property {Object} twitter - Twitter Card spécifique
 */

// ==================== ÉTAT GLOBAL ====================

let pageSEOConfigs = [];
let currentPagePath = '';
let jsonLdData = [];

// ==================== INITIALISATION ====================

/**
 * Initialise le gestionnaire SEO
 */
async function initSEOManager() {
  console.log('[SEO Manager] Initialisation...');
  
  // Charger la configuration sauvegardée
  loadSEOConfig();
  
  // Déterminer la page courante
  currentPagePath = getCurrentPagePath();
  
  // Appliquer les métadonnées SEO
  applySEOMetadata();
  
  // Injecter les données structurées
  injectStructuredData();
  
  // Initialiser les analytics
  initAnalytics();
  
  console.log('[SEO Manager] Initialisé avec succès');
}

/**
 * Charge la configuration SEO sauvegardée
 */
function loadSEOConfig() {
  try {
    const saved = localStorage.getItem(SEO_CONFIG.storageKey);
    if (saved) {
      const config = JSON.parse(saved);
      if (config.ga4Id) SEO_CONFIG.ga4Id = config.ga4Id;
      if (config.gtmId) SEO_CONFIG.gtmId = config.gtmId;
      if (config.matomoUrl) SEO_CONFIG.matomoUrl = config.matomoUrl;
      if (config.pageConfigs) pageSEOConfigs = config.pageConfigs;
    }
  } catch (e) {
    console.error('[SEO Manager] Erreur chargement config:', e);
  }
}

/**
 * Sauvegarde la configuration SEO
 */
function saveSEOConfig() {
  try {
    const config = {
      ga4Id: SEO_CONFIG.ga4Id,
      gtmId: SEO_CONFIG.gtmId,
      matomoUrl: SEO_CONFIG.matomoUrl,
      pageConfigs: pageSEOConfigs,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(SEO_CONFIG.storageKey, JSON.stringify(config));
  } catch (e) {
    console.error('[SEO Manager] Erreur sauvegarde config:', e);
  }
}

/**
 * Récupère le chemin de la page courante
 * @returns {string}
 */
function getCurrentPagePath() {
  const path = window.location.pathname;
  return path === '/' || path === '/index.html' ? '/' : path;
}

// ==================== MÉTADONNÉES SEO ====================

/**
 * Applique les métadonnées SEO à la page courante
 */
function applySEOMetadata() {
  const pageConfig = getPageSEOConfig(currentPagePath);
  
  // Title
  const title = pageConfig?.title || SEO_CONFIG.defaultTitle;
  document.title = title;
  
  // Meta description
  const description = pageConfig?.description || SEO_CONFIG.defaultDescription;
  updateMetaTag('description', description);
  
  // Meta keywords
  const keywords = pageConfig?.keywords || SEO_CONFIG.defaultKeywords;
  updateMetaTag('keywords', keywords.join(', '));
  
  // Meta author
  updateMetaTag('author', SEO_CONFIG.author);
  
  // Canonical URL
  const canonical = pageConfig?.canonical || SEO_CONFIG.siteUrl + currentPagePath;
  updateCanonicalLink(canonical);
  
  // Open Graph
  applyOpenGraph(pageConfig);
  
  // Twitter Card
  applyTwitterCard(pageConfig);
  
  // Hreflang
  applyHreflang();
}

/**
 * Met à jour ou crée une balise meta
 * @param {string} name - Nom de la meta
 * @param {string} content - Contenu
 */
function updateMetaTag(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

/**
 * Met à jour la balise link canonical
 * @param {string} url - URL canonique
 */
function updateCanonicalLink(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/**
 * Applique les balises Open Graph
 * @param {Object} pageConfig - Configuration de la page
 */
function applyOpenGraph(pageConfig) {
  const ogConfig = pageConfig?.og || {};
  
  const ogTags = {
    'og:title': ogConfig.title || pageConfig?.title || SEO_CONFIG.defaultTitle,
    'og:description': ogConfig.description || pageConfig?.description || SEO_CONFIG.defaultDescription,
    'og:url': SEO_CONFIG.siteUrl + currentPagePath,
    'og:type': ogConfig.type || 'website',
    'og:site_name': SEO_CONFIG.siteName,
    'og:image': ogConfig.image || SEO_CONFIG.defaultImage,
    'og:image:alt': ogConfig.imageAlt || SEO_CONFIG.defaultImageAlt,
    'og:locale': SEO_CONFIG.defaultLanguage,
    'og:locale:alternate': SEO_CONFIG.supportedLanguages.filter(l => l !== SEO_CONFIG.defaultLanguage).join(',')
  };
  
  for (const [property, content] of Object.entries(ogTags)) {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }
}

/**
 * Applique les balises Twitter Card
 * @param {Object} pageConfig - Configuration de la page
 */
function applyTwitterCard(pageConfig) {
  const twitterConfig = pageConfig?.twitter || {};
  
  const twitterTags = {
    'twitter:card': twitterConfig.card || 'summary_large_image',
    'twitter:site': SEO_CONFIG.twitterSite,
    'twitter:creator': SEO_CONFIG.twitterHandle,
    'twitter:title': twitterConfig.title || pageConfig?.title || SEO_CONFIG.defaultTitle,
    'twitter:description': twitterConfig.description || pageConfig?.description || SEO_CONFIG.defaultDescription,
    'twitter:image': twitterConfig.image || SEO_CONFIG.defaultImage,
    'twitter:image:alt': twitterConfig.imageAlt || SEO_CONFIG.defaultImageAlt
  };
  
  for (const [name, content] of Object.entries(twitterTags)) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }
}

/**
 * Applique les balises hreflang pour le multilingue
 */
function applyHreflang() {
  for (const lang of SEO_CONFIG.supportedLanguages) {
    const url = SEO_CONFIG.siteUrl + currentPagePath;
    let link = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lang);
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}

// ==================== DONNÉES STRUCTURÉES (JSON-LD) ====================

/**
 * Injecte les données structurées dans la page
 */
function injectStructuredData() {
  // Organisation
  addStructuredData(getOrganizationSchema());
  
  // Site web
  addStructuredData(getWebSiteSchema());
  
  // Selon la page, ajouter des schémas spécifiques
  if (currentPagePath === '/' || currentPagePath === '/index.html') {
    addStructuredData(getLocalBusinessSchema());
  } else if (currentPagePath.includes('bilan')) {
    addStructuredData(getMedicalWebPageSchema());
  } else if (currentPagePath.includes('faq')) {
    addStructuredData(getFAQSchema());
  }
}

/**
 * Ajoute des données structurées à la page
 * @param {Object} data - Données JSON-LD
 */
function addStructuredData(data) {
  if (!data) return;
  
  const script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
  jsonLdData.push(data);
}

/**
 * Schéma Organisation
 * @returns {Object}
 */
function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    'name': SEO_CONFIG.siteName,
    'alternateName': 'CaliDoc Santé',
    'url': SEO_CONFIG.siteUrl,
    'logo': SEO_CONFIG.siteUrl + '/assets/images/logo.png',
    'email': 'contact@calidoc-sante.fr',
    'telephone': '+33 5 45 XX XX XX',
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': '4 rue Saint-André',
      'addressLocality': 'Angoulême',
      'postalCode': '16000',
      'addressCountry': 'FR'
    },
    'sameAs': [
      'https://www.facebook.com/nutridoc',
      'https://www.instagram.com/nutridoc',
      'https://www.linkedin.com/company/nutridoc'
    ],
    'medicalSpecialty': 'Nutrition'
  };
}

/**
 * Schéma WebSite
 * @returns {Object}
 */
function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': SEO_CONFIG.siteName,
    'url': SEO_CONFIG.siteUrl,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': SEO_CONFIG.siteUrl + '/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Schéma LocalBusiness
 * @returns {Object}
 */
function getLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    'name': SEO_CONFIG.siteName,
    'url': SEO_CONFIG.siteUrl,
    'description': SEO_CONFIG.defaultDescription,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': '4 rue Saint-André',
      'addressLocality': 'Angoulême',
      'postalCode': '16000',
      'addressCountry': 'FR'
    },
    'priceRange': '€€',
    'telephone': '+33 5 45 XX XX XX'
  };
}

/**
 * Schéma MedicalWebPage
 * @returns {Object}
 */
function getMedicalWebPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    'name': 'Bilan nutritionnel gratuit',
    'description': 'Réalisez votre bilan nutritionnel en ligne gratuitement',
    'url': SEO_CONFIG.siteUrl + currentPagePath,
    'mainEntityOfPage': SEO_CONFIG.siteUrl + currentPagePath,
    'medicalAudience': {
      '@type': 'MedicalAudience',
      'audienceType': 'Patient'
    }
  };
}

/**
 * Schéma FAQ
 * @returns {Object}
 */
function getFAQSchema() {
  const faqItems = getFAQItems();
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqItems.map(item => ({
      '@type': 'Question',
      'name': item.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.answer
      }
    }))
  };
}

/**
 * Récupère les questions FAQ
 * @returns {Array}
 */
function getFAQItems() {
  // FAQ statique - peut être dynamique depuis une source externe
  return [
    {
      question: 'Comment fonctionne le bilan nutritionnel gratuit ?',
      answer: 'Le bilan nutritionnel gratuit prend 5 minutes. Vous répondez à quelques questions sur vos habitudes alimentaires, votre activité physique et vos objectifs. Vous recevez ensuite des recommandations personnalisées immédiatement.'
    },
    {
      question: 'Combien coûte un plan alimentaire personnalisé ?',
      answer: 'Le plan alimentaire personnalisé coûte 24,90€ TTC. Il est élaboré et signé par un diététicien certifié RPPS, livré sous 48h.'
    },
    {
      question: 'La consultation visio est-elle remboursée par la mutuelle ?',
      answer: 'Selon votre contrat mutuelle, la consultation visio (55€) peut être partiellement remboursée. NutriDoc génère automatiquement une attestation de consultation pour faciliter votre demande de remboursement.'
    }
  ];
}

// ==================== ANALYTICS ====================

/**
 * Initialise les outils d'analyse
 */
function initAnalytics() {
  if (SEO_CONFIG.ga4Id) {
    initGA4();
  }
  if (SEO_CONFIG.gtmId) {
    initGTM();
  }
  if (SEO_CONFIG.matomoUrl) {
    initMatomo();
  }
}

/**
 * Initialise Google Analytics 4
 */
function initGA4() {
  if (typeof gtag !== 'undefined') return;
  
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${SEO_CONFIG.ga4Id}`;
  document.head.appendChild(script);
  
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', SEO_CONFIG.ga4Id);
  
  console.log('[SEO Manager] GA4 initialisé:', SEO_CONFIG.ga4Id);
}

/**
 * Initialise Google Tag Manager
 */
function initGTM() {
  if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${SEO_CONFIG.gtmId}"]`)) return;
  
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${SEO_CONFIG.gtmId}`;
  document.head.appendChild(script);
  
  console.log('[SEO Manager] GTM initialisé:', SEO_CONFIG.gtmId);
}

/**
 * Initialise Matomo (Piwik)
 */
function initMatomo() {
  if (document.querySelector(`script[src="${SEO_CONFIG.matomoUrl}"]`)) return;
  
  const script = document.createElement('script');
  script.async = true;
  script.src = SEO_CONFIG.matomoUrl;
  document.head.appendChild(script);
  
  console.log('[SEO Manager] Matomo initialisé:', SEO_CONFIG.matomoUrl);
}

// ==================== SITEMAP & ROBOTS ====================

/**
 * Génère le contenu du sitemap.xml
 * @returns {string}
 */
function generateSitemap() {
  const pages = getAllPages();
  const now = new Date().toISOString();
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const page of pages) {
    xml += '  <url>\n';
    xml += `    <loc>${SEO_CONFIG.siteUrl}${page.path}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>';
  return xml;
}

/**
 * Récupère toutes les pages du site
 * @returns {Array}
 */
function getAllPages() {
  return [
    { path: '/', priority: '1.0' },
    { path: '/bilan.html', priority: '0.9' },
    { path: '/dashboard.html', priority: '0.8' },
    { path: '/dietitian.html', priority: '0.8' },
    { path: '/prescripteur-dashboard.html', priority: '0.8' },
    { path: '/faq.html', priority: '0.7' },
    { path: '/contact.html', priority: '0.7' },
    { path: '/mentions-legales.html', priority: '0.5' },
    { path: '/politique-confidentialite.html', priority: '0.5' },
    { path: '/cgu-patient.html', priority: '0.5' },
    { path: '/cgu-dieteticien.html', priority: '0.5' },
    { path: '/cgu-prescripteur.html', priority: '0.5' },
    { path: '/accueil-dieteticien.html', priority: '0.8' },
    { path: '/accueil-prescripteur.html', priority: '0.8' },
    { path: '/partenariats.html', priority: '0.8' }
  ];
}

/**
 * Génère le contenu du robots.txt
 * @returns {string}
 */
function generateRobotsTxt() {
  let content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard-dieteticien.html
Disallow: /prescripteur-dashboard.html
Disallow: /prescripteur-crm.html
Disallow: /compta-dieteticien.html
Disallow: /compta-prescripteur.html
Disallow: /gestion-forfait-dieteticien.html
Disallow: /webhooks.html
Disallow: /backup-restore.html
Disallow: /seo.html

Sitemap: ${SEO_CONFIG.siteUrl}/sitemap.xml

# Délai d'exploration
Crawl-delay: 1

# Robots d'exploration spécifiques
User-agent: Googlebot
Allow: /
Crawl-delay: 0.5

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Yandex
Allow: /
Crawl-delay: 2
`;
  return content;
}

// ==================== CONFIGURATION PAGES ====================

/**
 * Définit la configuration SEO d'une page
 * @param {string} path - Chemin de la page
 * @param {Object} config - Configuration
 */
function setPageSEOConfig(path, config) {
  const index = pageSEOConfigs.findIndex(c => c.path === path);
  if (index !== -1) {
    pageSEOConfigs[index] = { path, ...config };
  } else {
    pageSEOConfigs.push({ path, ...config });
  }
  saveSEOConfig();
  
  // Si c'est la page courante, appliquer immédiatement
  if (path === currentPagePath) {
    applySEOMetadata();
  }
}

/**
 * Récupère la configuration SEO d'une page
 * @param {string} path - Chemin de la page
 * @returns {Object|null}
 */
function getPageSEOConfig(path) {
  return pageSEOConfigs.find(c => c.path === path) || null;
}

/**
 * Supprime la configuration SEO d'une page
 * @param {string} path - Chemin de la page
 */
function deletePageSEOConfig(path) {
  pageSEOConfigs = pageSEOConfigs.filter(c => c.path !== path);
  saveSEOConfig();
}

// ==================== CONFIGURATION GLOBALE ====================

/**
 * Définit l'ID Google Analytics 4
 * @param {string} id - ID GA4 (format: G-XXXXXXXXXX)
 */
function setGA4Id(id) {
  SEO_CONFIG.ga4Id = id;
  saveSEOConfig();
  initGA4();
}

/**
 * Définit l'ID Google Tag Manager
 * @param {string} id - ID GTM (format: GTM-XXXXXX)
 */
function setGTMId(id) {
  SEO_CONFIG.gtmId = id;
  saveSEOConfig();
  initGTM();
}

/**
 * Définit l'URL Matomo
 * @param {string} url - URL Matomo
 */
function setMatomoUrl(url) {
  SEO_CONFIG.matomoUrl = url;
  saveSEOConfig();
  initMatomo();
}

// ==================== AUDIT SEO ====================

/**
 * Effectue un audit SEO de la page courante
 * @returns {Object}
 */
function runSEOAudit() {
  const issues = [];
  const warnings = [];
  const passed = [];
  
  // Vérifier la présence des métadonnées
  const title = document.title;
  if (!title || title.length === 0) {
    issues.push('Titre manquant');
  } else if (title.length < 30) {
    warnings.push('Titre trop court (< 30 caractères)');
  } else if (title.length > 60) {
    warnings.push('Titre trop long (> 60 caractères)');
  } else {
    passed.push('Titre correctement dimensionné');
  }
  
  // Vérifier la meta description
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content');
  if (!description || description.length === 0) {
    issues.push('Meta description manquante');
  } else if (description.length < 120) {
    warnings.push('Meta description trop courte (< 120 caractères)');
  } else if (description.length > 160) {
    warnings.push('Meta description trop longue (> 160 caractères)');
  } else {
    passed.push('Meta description correctement dimensionnée');
  }
  
  // Vérifier les balises Open Graph
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  if (!ogTitle) {
    warnings.push('Open Graph title manquant');
  } else {
    passed.push('Open Graph title présent');
  }
  
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (!ogImage) {
    warnings.push('Open Graph image manquante');
  } else {
    passed.push('Open Graph image présente');
  }
  
  // Vérifier les balises heading
  const h1Count = document.querySelectorAll('h1').length;
  if (h1Count === 0) {
    issues.push('Aucune balise H1');
  } else if (h1Count > 1) {
    warnings.push('Plusieurs balises H1');
  } else {
    passed.push('Une seule balise H1');
  }
  
  // Vérifier les images avec alt
  const imagesWithoutAlt = document.querySelectorAll('img:not([alt])').length;
  if (imagesWithoutAlt > 0) {
    warnings.push(`${imagesWithoutAlt} image(s) sans attribut alt`);
  } else {
    passed.push('Toutes les images ont un attribut alt');
  }
  
  // Vérifier les liens internes
  const internalLinks = document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"]').length;
  passed.push(`${internalLinks} liens internes trouvés`);
  
  // Vérifier le chargement
  const loadTime = performance.timing?.loadEventEnd - performance.timing?.navigationStart;
  if (loadTime && loadTime > 3000) {
    warnings.push(`Temps de chargement élevé: ${Math.round(loadTime)}ms`);
  } else if (loadTime) {
    passed.push(`Temps de chargement: ${Math.round(loadTime)}ms`);
  }
  
  // Vérifier le responsive
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    issues.push('Viewport manquant (site non responsive)');
  } else {
    passed.push('Viewport présent (site responsive)');
  }
  
  // Vérifier le SSL/HTTPS
  if (window.location.protocol === 'https:') {
    passed.push('Site sécurisé HTTPS');
  } else {
    issues.push('Site non sécurisé (HTTPS requis)');
  }
  
  // Calculer le score
  const totalChecks = issues.length + warnings.length + passed.length;
  const score = Math.round((passed.length / totalChecks) * 100);
  
  return {
    score: score,
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    issues: issues,
    warnings: warnings,
    passed: passed,
    recommendations: [
      ...issues.map(i => `❌ ${i}`),
      ...warnings.map(w => `⚠️ ${w}`),
      ...passed.map(p => `✅ ${p}`)
    ]
  };
}

// ==================== EXPORTS GLOBAUX ====================

// Exporter les fonctions pour l'usage global
window.seoManager = {
  init: initSEOManager,
  setPageConfig: setPageSEOConfig,
  getPageConfig: getPageSEOConfig,
  deletePageConfig: deletePageSEOConfig,
  setGA4Id: setGA4Id,
  setGTMId: setGTMId,
  setMatomoUrl: setMatomoUrl,
  generateSitemap: generateSitemap,
  generateRobotsTxt: generateRobotsTxt,
  runAudit: runSEOAudit,
  addStructuredData: addStructuredData
};

// Pour compatibilité avec l'interface admin
window.setPageSEOConfig = setPageSEOConfig;
window.getPageSEOConfig = getPageSEOConfig;
window.runSEOAudit = runSEOAudit;
window.generateSitemap = generateSitemap;
window.generateRobotsTxt = generateRobotsTxt;

// Auto-initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSEOManager);
} else {
  initSEOManager();
}

console.log('[seo-manager.js] ✅ Chargé avec succès');