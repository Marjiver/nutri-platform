# NutriDoc — Plateforme de pré-bilan nutritionnel

Application web sécurisée de pré-bilan nutritionnel avec génération assistée de plans et validation par diététicien.

## Pages

| Fichier | Description |
|---|---|
| `index.html` | Page d'accueil |
| `bilan.html` | Formulaire de pré-bilan (4 étapes) |
| `dashboard.html` | Tableau de bord patient |
| `dietitian.html` | Espace de validation diététicien |

## Structure

```
nutridoc-platform/
├── index.html
├── bilan.html
├── dashboard.html
├── dietitian.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── bilan.js
│   ├── dashboard.js
│   └── dietitian.js
└── README.md
```

## Lancer en local

Ouvre simplement `index.html` dans ton navigateur, ou utilise une extension Live Server dans VS Code.

## Hébergement GitHub Pages

1. Va dans Settings → Pages
2. Sélectionne la branche `main`
3. Ton site sera disponible sur `https://ton-pseudo.github.io/nutridoc-platform`

## Prochaines étapes

- [ ] Connexion à une API IA pour générer les plans
- [ ] Authentification utilisateur
- [ ] Base de données (Supabase ou Firebase)
- [ ] Notifications email
