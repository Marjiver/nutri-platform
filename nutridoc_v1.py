"""
NutriDoc V1 - Version simple et fonctionnelle
=============================================
Application de prescription de plans alimentaires
Sans dépendances complexes - juste Streamlit
"""

import streamlit as st
import json
import os
from datetime import datetime

# Configuration de la page
st.set_page_config(
    page_title="NutriDoc - Prescription alimentaire",
    page_icon="🥗",
    layout="wide"
)

# Style personnalisé
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%);
        padding: 1.5rem;
        border-radius: 10px;
        color: white;
        margin-bottom: 2rem;
    }
    .patient-card {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 10px;
        margin: 0.5rem 0;
        border-left: 4px solid #1D9E75;
    }
    .success-badge {
        background: #d4edda;
        color: #155724;
        padding: 0.2rem 0.5rem;
        border-radius: 20px;
        font-size: 0.8rem;
        display: inline-block;
    }
    .warning-badge {
        background: #fff3cd;
        color: #856404;
        padding: 0.2rem 0.5rem;
        border-radius: 20px;
        font-size: 0.8rem;
        display: inline-block;
    }
</style>
""", unsafe_allow_html=True)

# Initialisation des données
def init_data():
    """Initialise les fichiers de données"""
    os.makedirs("nutridoc_data", exist_ok=True)
    
    patients_file = "nutridoc_data/patients.json"
    if not os.path.exists(patients_file):
        with open(patients_file, 'w', encoding='utf-8') as f:
            json.dump({}, f)
    
    with open(patients_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(patients):
    """Sauvegarde les données"""
    with open("nutridoc_data/patients.json", 'w', encoding='utf-8') as f:
        json.dump(patients, f, ensure_ascii=False, indent=2)

# Chargement des données
patients = init_data()

# Entête
st.markdown("""
<div class="main-header">
    <h1 style="margin:0">🥗 NutriDoc</h1>
    <p style="margin:0; opacity:0.9">Plateforme de prescription de plans alimentaires personnalisés</p>
</div>
""", unsafe_allow_html=True)

# Sidebar - Navigation
with st.sidebar:
    st.image("https://via.placeholder.com/200x80/1D9E75/white?text=NutriDoc", use_column_width=True)
    st.markdown("---")
    
    menu = st.radio(
        "📋 Menu principal",
        ["🏠 Accueil", "➕ Nouveau patient", "📋 Liste des patients", "📊 Statistiques", "ℹ️ Aide"]
    )
    
    st.markdown("---")
    st.caption(f"📅 {datetime.now().strftime('%d/%m/%Y')}")
    st.caption(f"👨‍⚕️ Version 1.0")

# ==================== PAGE ACCUEIL ====================
if menu == "🏠 Accueil":
    st.markdown("## Bienvenue sur NutriDoc 👋")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            "👥 Patients enregistrés",
            len(patients),
            delta="+ nouveau" if len(patients) > 0 else "Commencez !"
        )
    
    with col2:
        plans_gen = sum(1 for p in patients.values() if p.get('plan_genere', False))
        st.metric("📄 Plans générés", plans_gen)
    
    with col3:
        if len(patients) > 0:
            ages = [p.get('age', 0) for p in patients.values()]
            age_moyen = sum(ages) / len(ages)
            st.metric("📊 Âge moyen", f"{age_moyen:.0f} ans")
        else:
            st.metric("📊 Âge moyen", "—")
    
    st.markdown("---")
    
    st.markdown("### 🚀 Actions rapides")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("➕ Créer un nouveau patient", use_container_width=True):
            menu = "➕ Nouveau patient"
            st.rerun()
    
    with col2:
        if st.button("📋 Voir la liste des patients", use_container_width=True):
            menu = "📋 Liste des patients"
            st.rerun()
    
    st.markdown("---")
    
    st.markdown("### 📝 Derniers patients")
    if patients:
        derniers = list(patients.values())[-3:]
        for patient in reversed(derniers):
            st.markdown(f"""
            <div class="patient-card">
                <strong>{patient['prenom']} {patient['nom']}</strong><br>
                🎯 {patient.get('objectif', 'Non défini')} | 📍 {patient.get('ville', 'Non renseignée')}
                {' <span class="success-badge">✅ Plan généré</span>' if patient.get('plan_genere') else ' <span class="warning-badge">⏳ En attente</span>'}
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("Aucun patient pour le moment. Cliquez sur 'Nouveau patient' pour commencer !")

# ==================== NOUVEAU PATIENT ====================
elif menu == "➕ Nouveau patient":
    st.markdown("## 👤 Créer un nouveau patient")
    
    with st.form("form_patient", clear_on_submit=False):
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("### Informations personnelles")
            prenom = st.text_input("Prénom *", placeholder="Jean")
            nom = st.text_input("Nom *", placeholder="Dupont")
            age = st.number_input("Âge *", min_value=0, max_value=120, value=30, step=1)
            ville = st.text_input("Ville *", placeholder="Paris")
        
        with col2:
            st.markdown("### Données médicales")
            poids = st.number_input("Poids (kg)", min_value=30, max_value=200, value=70, step=1)
            taille = st.number_input("Taille (cm)", min_value=100, max_value=220, value=170, step=1)
            
            objectif = st.selectbox(
                "Objectif principal *",
                ["Prise de masse musculaire", "Perte de poids", "Équilibre alimentaire", "Performance sportive"]
            )
            
            budget = st.select_slider(
                "Budget alimentaire",
                options=["Économique (< 40€/semaine)", "Moyen (40-70€/semaine)", "Confort (> 70€/semaine)"]
            )
        
        st.markdown("---")
        st.markdown("### 🏥 Informations complémentaires")
        
        col1, col2 = st.columns(2)
        with col1:
            restrictions = st.multiselect(
                "Restrictions alimentaires",
                ["Aucune", "Végétarien", "Sans gluten", "Sans lactose", "Végétalien"]
            )
        with col2:
            pathologies = st.multiselect(
                "Pathologies connues",
                ["Aucune", "Diabète", "Hypertension", "Cholestérol", "Problèmes thyroïdiens"]
            )
        
        notes = st.text_area("Notes médicales complémentaires", placeholder="Informations importantes...")
        
        st.markdown("---")
        consentement = st.checkbox("✅ J'atteste avoir obtenu le consentement du patient")
        
        submitted = st.form_submit_button("💾 Enregistrer le patient", use_container_width=True)
        
        if submitted:
            if not all([prenom, nom, age, ville]):
                st.error("❌ Veuillez remplir tous les champs obligatoires (*)")
            elif not consentement:
                st.error("❌ Le consentement du patient est requis")
            else:
                # Création de l'ID unique
                patient_id = f"{prenom}_{nom}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                
                # Calcul IMC
                imc = poids / ((taille/100) ** 2) if poids and taille else 0
                
                patient_data = {
                    'id': patient_id,
                    'prenom': prenom,
                    'nom': nom,
                    'age': age,
                    'ville': ville,
                    'poids': poids,
                    'taille': taille,
                    'imc': round(imc, 1),
                    'objectif': objectif,
                    'budget': budget,
                    'restrictions': restrictions if restrictions != ["Aucune"] else [],
                    'pathologies': pathologies if pathologies != ["Aucune"] else [],
                    'notes': notes,
                    'date_inscription': datetime.now().strftime('%d/%m/%Y à %H:%M'),
                    'plan_genere': False,
                    'plan_data': None
                }
                
                patients[patient_id] = patient_data
                save_data(patients)
                
                st.success(f"✅ Patient {prenom} {nom} enregistré avec succès !")
                st.balloons()
                
                # Afficher le résumé
                with st.expander("📋 Voir le résumé du patient"):
                    col1, col2 = st.columns(2)
                    with col1:
                        st.write("**Informations générales**")
                        st.write(f"- Nom complet : {prenom} {nom}")
                        st.write(f"- Âge : {age} ans")
                        st.write(f"- Ville : {ville}")
                        st.write(f"- IMC : {imc:.1f}")
                    with col2:
                        st.write("**Objectifs**")
                        st.write(f"- Objectif : {objectif}")
                        st.write(f"- Budget : {budget}")
                        if restrictions and restrictions != ["Aucune"]:
                            st.write(f"- Restrictions : {', '.join(restrictions)}")

# ==================== LISTE DES PATIENTS ====================
elif menu == "📋 Liste des patients":
    st.markdown("## 📋 Liste des patients")
    
    if not patients:
        st.info("📭 Aucun patient enregistré. Commencez par créer un nouveau patient !")
    else:
        # Barre de recherche
        recherche = st.text_input("🔍 Rechercher un patient", placeholder="Nom, prénom ou ville...")
        
        # Filtres
        col1, col2 = st.columns(2)
        with col1:
            filtre_objectif = st.multiselect("Filtrer par objectif", 
                                            ["Prise de masse musculaire", "Perte de poids", "Équilibre alimentaire", "Performance sportive"])
        with col2:
            filtre_plan = st.selectbox("Filtrer par statut", ["Tous", "Plan généré", "Plan à générer"])
        
        # Application des filtres
        patients_filtres = []
        for pid, p in patients.items():
            # Recherche
            if recherche and recherche.lower() not in f"{p['prenom']} {p['nom']} {p['ville']}".lower():
                continue
            
            # Objectif
            if filtre_objectif and p.get('objectif') not in filtre_objectif:
                continue
            
            # Statut plan
            if filtre_plan == "Plan généré" and not p.get('plan_genere'):
                continue
            if filtre_plan == "Plan à générer" and p.get('plan_genere'):
                continue
            
            patients_filtres.append(p)
        
        st.caption(f"📊 {len(patients_filtres)} patient(s) trouvé(s)")
        
        # Affichage des patients
        for patient in patients_filtres:
            with st.container():
                col1, col2, col3, col4 = st.columns([2, 2, 2, 1])
                
                with col1:
                    st.markdown(f"**{patient['prenom']} {patient['nom']}**")
                    st.caption(f"🎂 {patient['age']} ans • 📍 {patient['ville']}")
                
                with col2:
                    st.markdown(f"**🎯 {patient.get('objectif', 'N/A')[:30]}**")
                    st.caption(f"💰 {patient.get('budget', 'N/A')[:20]}")
                
                with col3:
                    if patient.get('plan_genere'):
                        st.markdown('<span class="success-badge">✅ Plan généré</span>', unsafe_allow_html=True)
                        st.caption(f"📅 {patient.get('date_plan', 'N/A')}")
                    else:
                        st.markdown('<span class="warning-badge">⏳ En attente</span>', unsafe_allow_html=True)
                
                with col4:
                    if st.button("📄 Voir", key=f"view_{patient['id']}"):
                        st.session_state.selected_patient = patient['id']
                        st.rerun()
                
                st.markdown("---")
        
        # Affichage du détail d'un patient sélectionné
        if 'selected_patient' in st.session_state:
            patient = patients.get(st.session_state.selected_patient)
            if patient:
                st.markdown("### 📋 Détail du patient")
                
                col1, col2 = st.columns(2)
                with col1:
                    st.markdown(f"""
                    **Informations générales**
                    - **Nom complet :** {patient['prenom']} {patient['nom']}
                    - **Âge :** {patient['age']} ans
                    - **Ville :** {patient['ville']}
                    - **Date inscription :** {patient.get('date_inscription', 'N/A')}
                    """)
                
                with col2:
                    st.markdown(f"""
                    **Données médicales**
                    - **Poids :** {patient.get('poids', 'N/A')} kg
                    - **Taille :** {patient.get('taille', 'N/A')} cm
                    - **IMC :** {patient.get('imc', 'N/A')}
                    - **Objectif :** {patient.get('objectif', 'N/A')}
                    """)
                
                if patient.get('pathologies'):
                    st.warning(f"**Pathologies :** {', '.join(patient['pathologies'])}")
                
                if patient.get('notes'):
                    st.info(f"**Notes :** {patient['notes']}")
                
                # Bouton pour générer le plan
                if not patient.get('plan_genere'):
                    if st.button("🎯 Générer un plan alimentaire", use_container_width=True):
                        with st.spinner("Génération du plan en cours..."):
                            # Ici tu appelleras ton générateur PDF
                            st.success("Plan généré avec succès !")
                            patient['plan_genere'] = True
                            patient['date_plan'] = datetime.now().strftime('%d/%m/%Y')
                            save_data(patients)
                            st.balloons()

# ==================== STATISTIQUES ====================
elif menu == "📊 Statistiques":
    st.markdown("## 📊 Tableau de bord statistique")
    
    if not patients:
        st.info("Aucune donnée disponible pour le moment")
    else:
        col1, col2, col3, col4 = st.columns(4)
        
        total = len(patients)
        plans = sum(1 for p in patients.values() if p.get('plan_genere', False))
        ages = [p.get('age', 0) for p in patients.values()]
        imcs = [p.get('imc', 0) for p in patients.values() if p.get('imc', 0) > 0]
        
        with col1:
            st.metric("👥 Total patients", total)
        with col2:
            st.metric("📄 Plans générés", plans, delta=f"{plans/total*100:.0f}%" if total > 0 else None)
        with col3:
            st.metric("📊 Âge moyen", f"{sum(ages)/len(ages):.0f} ans" if ages else "N/A")
        with col4:
            st.metric("⚖️ IMC moyen", f"{sum(imcs)/len(imcs):.1f}" if imcs else "N/A")
        
        st.markdown("---")
        
        # Répartition des objectifs
        st.markdown("### 🎯 Répartition des objectifs")
        objectifs = {}
        for p in patients.values():
            obj = p.get('objectif', 'Non défini')
            objectifs[obj] = objectifs.get(obj, 0) + 1
        
        for obj, count in objectifs.items():
            st.progress(count/total, text=f"{obj}: {count} patient(s) ({count/total*100:.0f}%)")
        
        # Répartition géographique
        st.markdown("### 📍 Villes des patients")
        villes = {}
        for p in patients.values():
            ville = p.get('ville', 'Inconnue')
            villes[ville] = villes.get(ville, 0) + 1
        
        for ville, count in sorted(villes.items(), key=lambda x: x[1], reverse=True)[:5]:
            st.write(f"- **{ville}** : {count} patient(s)")
        
        # Derniers inscrits
        st.markdown("### 🆕 Derniers inscrits")
        derniers = list(patients.values())[-5:]
        for p in reversed(derniers):
            st.write(f"- {p['prenom']} {p['nom']} ({p['age']} ans) - {p.get('date_inscription', 'N/A')}")

# ==================== AIDE ====================
elif menu == "ℹ️ Aide":
    st.markdown("## ℹ️ Guide d'utilisation")
    
    with st.expander("🎯 Comment créer un nouveau patient ?"):
        st.markdown("""
        1. Cliquez sur **Nouveau patient** dans le menu
        2. Remplissez le formulaire avec les informations du patient
        3. Validez en cliquant sur **Enregistrer**
        4. Le patient apparaîtra dans la liste
        """)
    
    with st.expander("📄 Comment générer un plan alimentaire ?"):
        st.markdown("""
        1. Allez dans **Liste des patients**
        2. Cliquez sur **Voir** à côté du patient
        3. Cliquez sur **Générer un plan alimentaire**
        4. Le PDF sera automatiquement créé
        """)
    
    with st.expander("🔍 Comment rechercher un patient ?"):
        st.markdown("""
        1. Allez dans **Liste des patients**
        2. Utilisez la barre de recherche en haut
        3. Filtrez par objectif ou statut si besoin
        """)
    
    with st.expander("📊 Que signifient les statistiques ?"):
        st.markdown("""
        - **IMC** : Indice de Masse Corporelle (poids/taille²)
        - **Objectif principal** : L'objectif le plus fréquent chez vos patients
        - **Taux de génération** : Pourcentage de patients ayant reçu un plan
        """)
    
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; padding: 2rem;">
        <h4>📞 Besoin d'aide ?</h4>
        <p>Contactez le support : support@nutridoc.com</p>
        <p style="font-size: 12px; color: gray;">NutriDoc Version 1.0 - Interface simplifiée</p>
    </div>
    """, unsafe_allow_html=True)

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center; color: gray; font-size: 12px;'>
    NutriDoc - Prescription de plans alimentaires personnalisés<br>
    © 2024 - Tous droits réservés
</div>
""", unsafe_allow_html=True)