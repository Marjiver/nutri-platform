# 👥 Personas NutriDoc

## 1️⃣ PERSONA : Marie - Patient

**Profil**
- Âge : 28 ans
- Métier : Employée de bureau
- Objectif : Perdre 7kg avant l'été
- Niveau tech : Moyen (smartphone + ordinateur)
- Périphérique principal : Smartphone (80%), Ordinateur (20%)

**Comportement**
- Recherche un plan simple et rapide
- Paie la consultation rapidement
- Consulte le plan 1-2 fois par jour sur mobile
- Besoin de guidance simple (pas de termes techniques)

**Journey**
```
index.html 
  → accueil-patient.html 
  → bilan.html (objectif: perte_poids)
  → inscription-patient.html
  → login.html?role=patient
  → dashboard.html (voir son plan)
  → profil-patient.html
```

**Questions clés à vérifier**
- [ ] Landing page compréhensible
- [ ] Bilan gratuit accessible en 2-3 clics
- [ ] Formulaire inscription rapide (<2 min)
- [ ] Dashboard affiche le plan clairement
- [ ] Mobile responsive (tous les boutons cliquables)

---

## 2️⃣ PERSONA : Dr. Laurent - Diététicien

**Profil**
- Âge : 45 ans
- Métier : Diététicien libéral (cabinet privé)
- Objectif : Valider les plans et générer revenus supplémentaires
- Niveau tech : Faible (peu à l'aise avec technologie)
- Périphérique principal : Ordinateur (90%), Tablette (10%)

**Comportement**
- Veut interface simple et claire
- Besoin de voir les patients rapidement
- Doit pouvoir valider un plan en <5 min
- Consulte 2-3 fois par semaine
- Besoin de voir ses revenus/compta

**Journey**
```
accueil-dieteticien.html
  → inscription-dieteticien.html (RPPS check)
  → login.html?role=dietitian
  → dietitian.html OU dashboard-dieteticien.html
  → Voir liste des patients
  → validation-plan.html
  → compta-dieteticien.html
```

**Questions clés à vérifier**
- [ ] Accueil diét rassurant et simple
- [ ] Inscription facile (explique RPPS)
- [ ] Dashboard affiche les patients à valider
- [ ] Validation plan simple (<2 clics)
- [ ] Compta claire (revenus, détails)
- [ ] Agenda pour RDV patients

---

## 3️⃣ PERSONA : Maxime - Prescripteur (Coach Sportif)

**Profil**
- Âge : 32 ans
- Métier : Coach sportif en salle + coaching en ligne
- Objectif : Revendre des plans alimentaires à ses clients
- Niveau tech : Élevé (très à l'aise, mobile-first)
- Périphérique principal : Smartphone (100%), Ordinateur (30%)

**Comportement**
- Besoin interface rapide et efficace
- Crée des clients via CRM
- Assigne des plans aux clients
- Veut tracker les crédits utilisés
- Besoin de rapports pour ses clients

**Journey**
```
accueil-prescripteur.html
  → inscription-prescripteur.html
  → login.html?role=prescriber
  → prescripteur-dashboard.html
  → prescripteur-crm.html (ajouter clients)
  → gestion-credits-prescripteur.html
  → partenariats.html (infos tarifs)
```

**Questions clés à vérifier**
- [ ] Inscription prescripteur rapide
- [ ] Dashboard affiche crédits restants
- [ ] CRM permet ajouter clients facilement
- [ ] Peut générer un plan pour son client
- [ ] Crédits décomptés correctement
- [ ] Mobile fluide pour gestion rapide

---

## Critères d'Audit Communs

### 🎯 Navigation
- [ ] Tous les liens fonctionnent
- [ ] Pas de lien cassé (404)
- [ ] Retour à l'accueil possible depuis chaque page
- [ ] Menu responsive sur mobile

### 🎨 UX/UI
- [ ] Couleurs cohérentes (vert #1D9E75, noir #0d2018)
- [ ] Typographie lisible (Outfit, Playfair)
- [ ] Boutons avec couleur d'action claire
- [ ] Pas de contenu qui se chevauche

### 📱 Responsive
- [ ] Mobile (375px) : tout lisible
- [ ] Tablette (768px) : layout adapté
- [ ] Desktop (1920px) : optimal
- [ ] Pas de scroll horizontal indésirable

### ⚡ Performance
- [ ] Pages chargent <3 secondes
- [ ] Images non pixelisées
- [ ] Pas de lag lors du scroll
- [ ] Formulaires réactifs

### ♿ Accessibilité
- [ ] Tous les inputs ont des labels
- [ ] Contraste couleur suffisant
- [ ] Navigable au clavier
- [ ] Pas d'erreurs console

### 🔒 Sécurité
- [ ] Pas d'infos sensibles en dur dans le code
- [ ] Pas de console.log des tokens
- [ ] Forms protégés (validation)
- [ ] Links externes en target="_blank" rel="noopener"

---

## Session de Test

**Durée estimée : 45-60 minutes**

Par persona :
- 10 min : Exploration landing page
- 10 min : Inscription/Login
- 10 min : Navigation dashboard
- 5 min : Vérification fonctionnalités clés
- 5 min : Tests mobiles

