# Audit de Cohérence - Plateforme NutriDoc

**Date** : 3 juin 2026  
**État** : 🔴 **BLOCAGES CRITIQUES DÉTECTÉS**

---

## 📊 Vue d'ensemble

- **42 pages HTML** identifiées
- **885 liens** analysés
- **136 liens manquants** (fichiers CSS/assets)
- **État de déploiement** : ❌ Non prêt

---

## 🚨 Problèmes Critiques (À corriger AVANT déploiement)

### 1. **Fichiers CSS Manquants** ⚠️ CRITIQUE

Les pages référencent des fichiers CSS qui n'existent pas :

| Fichier manquant | Nombre de pages affectées |
|---|---|
| `css/dark-mode.css` | 25+ pages |
| `css/dark-mode-variables.css` | 10+ pages |

**Impact** : Les pages s'affichent sans mise en forme CSS. Site non fonctionnel.

**Solution** :
```bash
# Option 1 : Créer les fichiers CSS manquants
touch css/dark-mode.css
touch css/dark-mode-variables.css

# Option 2 : Corriger les liens HTML pour pointer vers les bons fichiers
# Remplacer : href="css/dark-mode.css"
# Par : href="css/home.css" ou href="css/admin.css"
```

---

### 2. **Dossier Icons Vide** ⚠️ CRITIQUE

- **Fichiers attendus** : Icônes PWA (72x72, 96x96, 128x128, 144x144, 192x192, etc.)
- **Fichiers trouvés** : ❌ Aucun
- **Impact** : PWA ne s'installera pas, pas d'icône sur l'écran d'accueil

**Manifest.json attend** :
```json
{
  "icons": [
    { "src": "/assets/icons/icon-72x72.png", "sizes": "72x72" },
    { "src": "/assets/icons/icon-96x96.png", "sizes": "96x96" },
    // ... plus 6 autres formats
  ]
}
```

**Solution** :
```bash
# Générer les icônes PWA
# Le script generate-icons.sh existe dans le projet
./generate-icons.sh

# Ou créer manuellement les fichiers PNG
```

---

### 3. **Chemin des Assets Incohérent**

Deux formats utilisés :
- Format absolu : `/assets/icons/icon-192x192.png`
- Format relatif : `assets/icons/icon-192x192.png`

**Impact** : Certains liens ne fonctionnent que si le site est à la racine du domaine.

**Solution** : Standardiser sur le format relatif pour tous les fichiers du projet
```html
<!-- À la place de -->
<img src="/assets/calidoc-logo.jpg">
<!-- Utiliser -->
<img src="assets/calidoc-logo.jpg">
```

---

## 📋 Flux d'Authentification

### État : ✅ STRUCTURE COMPLÈTE

Toutes les pages clés existent :

```
index.html (Landing)
    ├─→ accueil-dieteticien.html (après sélection)
    ├─→ accueil-patient.html
    └─→ accueil-prescripteur.html
        ↓
    inscription-[role].html
        ↓
    login.html?role=[role]
        ↓
    dashboard-[role].html
```

**À vérifier** :
- [ ] Les redirections après inscription fonctionnent
- [ ] Les paramètres de requête `?role=` sont gérés en JavaScript
- [ ] La persistance de session (localStorage/sessionStorage) fonctionne

---

## 🔗 Problèmes de Liens Avec Paramètres

Certains liens incluent des paramètres qui doivent être gérés en JavaScript :

### Exemples :
```html
<!-- Ces liens existent mais nécessitent du JS côté client -->
<a href="login.html?role=patient">
<a href="bilan.html?objectif=perte_poids">
<a href="inscription-dieteticien.html?formule=decouverte">
```

**À vérifier** : Chaque page lit et traite correctement ses URL parameters
```javascript
const params = new URLSearchParams(window.location.search);
const role = params.get('role'); // Doit être utilisé
```

---

## 📦 Structure CSS Actuelle

### Fichiers CSS existants :
| Fichier | Taille | Utilisation |
|---|---|---|
| `css/home.css` | 29 KB | Pages publiques, dashboards |
| `css/admin.css` | 16 KB | Pages admin |
| `css/partenaires.css` | 13.6 KB | Pages partenaires |
| `css/style.css` | 16 bytes | ⚠️ Vide (à supprimer) |
| `dark-mode.css` | ❌ MANQUANT | Dark mode |

**Recommandation** : Consolider en 2-3 fichiers CSS au maximum pour réduire les requêtes HTTP.

---

## 🔐 Vérifications de Sécurité & Intégration

### À tester avant déploiement :

#### 1. **Supabase / Base de données**
- [ ] Toutes les tables existent (`users`, `dieticians`, `patients`, `prescribers`, `meal_plans`, etc.)
- [ ] Les clés publiques/privées sont configurées dans chaque page
- [ ] Les politiques de sécurité RLS (Row Level Security) sont actives

#### 2. **Service Worker**
- [ ] `sw.js` fonctionne (mise en cache, offline mode)
- [ ] `offline.html` s'affiche quand il n'y a pas de réseau
- [ ] Les assets essentiels sont mis en cache

#### 3. **Authentification**
- [ ] Le token JWT est stocké de façon sécurisée
- [ ] Logout efface correctement le token
- [ ] Les redirections non-authentifiées vers login marchent

#### 4. **Pages Personnalisées par Rôle**
```
Diététicien   → accueil-dieteticien.html → dashboard-dieteticien.html
Patient       → accueil-patient.html     → dashboard.html + profil-patient.html
Prescripteur  → accueil-prescripteur.html → prescripteur-dashboard.html
```

- [ ] Chaque rôle voit uniquement ses pages
- [ ] Les templates de CRM s'affichent correctement
  - [ ] `prescripteur-crm.html`
  - [ ] `partenaire-crm.html`

---

## 📱 Responsive & Dark Mode

### À vérifier sur tous les appareils :
- [ ] **Mobile (375px)** : Tous les formulaires, tableaux lisibles
- [ ] **Tablette (768px)** : Layout adapté
- [ ] **Desktop (1920px)** : Optimal
- [ ] **Dark mode** : Alternance sans bugs visuels
- [ ] **Mode offline** : `offline.html` affichée correctement

---

## 📝 Checklist de Déploiement

### Avant mise en ligne :

**🔴 CRITIQUES (Bloquer le déploiement)**
- [ ] Créer `css/dark-mode.css` et `css/dark-mode-variables.css`
- [ ] Générer et placer toutes les icônes PWA dans `assets/icons/`
- [ ] Vérifier que le manifest.json pointe vers les bonnes icônes
- [ ] Tester le Service Worker en mode offline
- [ ] Vérifier l'authentification Supabase fonctionne

**🟡 IMPORTANTS (Corriger avant production)**
- [ ] Standardiser les chemins CSS/assets (relatif partout)
- [ ] Tester tous les flux d'authentification
- [ ] Vérifier que localStorage/sessionStorage ne pose pas de problème
- [ ] Tester les redirections avec paramètres (`?role=`, `?objectif=`)
- [ ] Valider la cohérence des rôles dans l'interface

**🟢 RECOMMANDÉ (Amélioration continue)**
- [ ] Minifier les CSS
- [ ] Compresser les images
- [ ] Ajouter des meta tags SEO cohérents
- [ ] Tester la performance (Lighthouse)
- [ ] Vérifier les CGU et mentions légales sont à jour

---

## 🚀 Prochaines Étapes Recommandées

1. **Jour 1** : Corriger les fichiers CSS manquants
2. **Jour 2** : Générer les icônes PWA
3. **Jour 3** : Tester chaque flux (auth, dashboards, CRM)
4. **Jour 4** : Déploiement sur OVH / staging
5. **Jour 5** : Tests en production (avant annonce)

---

**Reste à faire avant mise en ligne** : ~2-3 jours de travail

