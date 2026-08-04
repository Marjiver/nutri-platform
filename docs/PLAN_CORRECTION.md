# 🔧 Plan de Correction - Problèmes Critiques

## Problèmes à Corriger (Ordre de Priorité)

### 1️⃣ 🔴 CRITIQUE : login.html - Inputs sans labels

**Fichier** : `login.html`  
**Problème** : Les inputs email/password n'ont pas de labels  
**Impact** : Page de connexion inaccessible pour utilisateurs malvoyants  
**Affecte** : Tous les personas (patient, diététicien, prescripteur)

**Action** :
```bash
# Vérifier la structure actuelle
grep -n "input.*type=\"email\"\|input.*type=\"password\"" login.html

# Ajouter les labels manquants dans le formulaire
```

---

### 2️⃣ 🔴 CRITIQUE : dashboard-dieteticien.html - 4 inputs sans labels

**Fichier** : `dashboard-dieteticien.html`  
**Problème** : 4 inputs sans labels  
**Impact** : Dashboard diététicien inaccessible  
**Affecte** : Dr. Laurent (Diététicien)

**Action** :
```bash
# Identifier tous les inputs
grep -n "<input" dashboard-dieteticien.html | head -20

# Ajouter les labels correspondants
```

---

### 3️⃣ 🟡 IMPORTANT : prescripteur-crm.html - Design incohérent

**Fichier** : `prescripteur-crm.html`  
**Problèmes** : 
- Pas de couleur verte primaire
- Police non configurée

**Action** :
```bash
# Vérifier le lien CSS
grep "link.*stylesheet" prescripteur-crm.html

# Ajouter : <link rel="stylesheet" href="css/home.css">
```

---

### 4️⃣ 🟡 IMPORTANT : inscription-patient.html - Pas de heading

**Fichier** : `inscription-patient.html`  
**Problème** : Pas de H1/H2 (mauvaise hiérarchie HTML)  
**Action** : Ajouter un `<h1>` au début du formulaire

---

### 5️⃣ 🟡 IMPORTANT : Autres pages - Labels manquants

Pages à vérifier et corriger :
- accueil-dieteticien.html : 3 inputs sans labels
- inscription-dieteticien.html : 2 inputs sans labels
- compta-dieteticien.html : 3 inputs sans labels
- gestion-credits-prescripteur.html : 2 inputs sans labels

---

## Étapes de Correction

### Étape 1 : Corriger login.html (5 min)

```html
<!-- Rechercher et remplacer -->

<!-- AVANT : -->
<input type="email" placeholder="...">

<!-- APRÈS : -->
<label for="login-email">Email</label>
<input type="email" id="login-email" placeholder="...">

<!-- Pareil pour password -->
```

### Étape 2 : Corriger dashboard-dieteticien.html (10 min)

1. Lister tous les inputs
2. Créer des labels uniques avec ids
3. Lier inputs et labels

### Étape 3 : Corriger prescripteur-crm.html (2 min)

Ajouter dans le `<head>` :
```html
<link rel="stylesheet" href="css/home.css">
```

### Étape 4 : Ajouter H1 à inscription-patient.html (1 min)

```html
<h1>Inscription Patient</h1>
```

### Étape 5 : Corriger autres pages (15 min)

Audit + correction des 5 autres pages

---

## Tests Après Correction

```bash
# 1. Vérifier que les labels existent
grep -c "<label" login.html dashboard-dieteticien.html

# 2. Vérifier que les couleurs sont OK
grep "#1D9E75\|#0f6e56" prescripteur-crm.html

# 3. Vérifier que les inputs ont des ids
grep "id=" login.html | wc -l
```

---

## Estimation Temps Total

| Tâche | Temps |
|---|---|
| Corriger login.html | 5 min |
| Corriger dashboard-dieteticien.html | 10 min |
| Corriger prescripteur-crm.html | 2 min |
| Corriger inscription-patient.html | 1 min |
| Corriger autres pages | 15 min |
| **Total** | **33 min** |

---

## Validation Après Correction

- [ ] Tester login avec keyboard navigation
- [ ] Tester dashboard-dieteticien avec screen reader simulation
- [ ] Vérifier prescripteur-crm.html a les couleurs correctes
- [ ] Lighthouse accessibility >85

