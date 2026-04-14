"""
fix_inscription_diet.py — Remplace le handler de soumission localStorage
par un handler Supabase dans inscription-dieteticien.html
À exécuter depuis la RACINE de nutri-platform/
"""

import re

with open('inscription-dieteticien.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Ancien handler à remplacer (de l'addEventListener jusqu'à la fermeture })
old_handler = """document.getElementById('inscriptionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('passwordConfirm').value;
  
  if (password !== passwordConfirm) {
    alert('Les mots de passe ne correspondent pas.');
    return;
  }
  if (password.length < 8) {
    alert('Le mot de passe doit contenir au moins 8 caractères.');
    return;
  }
  
  const cgu = document.getElementById('cgu').checked;
  if (!cgu) {
    alert('Vous devez accepter les CGU pour continuer.');
    return;
  }
  
  const email = document.getElementById('email').value;
  const prenom = document.getElementById('prenom').value;
  const nom = document.getElementById('nom').value;
  
  // Sauvegarder dans localStorage
  document.getElementById('inscriptionForm').style.display = 'none';
  document.getElementById('inscriptionConfirmation').classList.remove('hidden');
  
  localStorage.setItem('nutridoc_dieteticien', JSON.stringify({ email, prenom, nom, formule: selectedFormule }));
  
  // Nettoyer le brouillon après inscription réussie
  setTimeout(() => {
    if (typeof clearCurrentDraft === 'function') {
      clearCurrentDraft('inscriptionForm');
    }
  }, 1000);
});"""

new_handler = """document.getElementById('inscriptionForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const password        = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('passwordConfirm').value;

  if (password.length < 8) {
    alert('Le mot de passe doit contenir au moins 8 caractères.'); return;
  }
  if (password !== passwordConfirm) {
    alert('Les mots de passe ne correspondent pas.'); return;
  }
  if (!document.getElementById('cgu').checked) {
    alert('Vous devez accepter les CGU pour continuer.'); return;
  }

  const payload = {
    email:      document.getElementById('email').value.trim(),
    password,
    prenom:     document.getElementById('prenom').value.trim(),
    nom:        document.getElementById('nom').value.trim(),
    tel:        document.getElementById('tel').value.trim(),
    siteWeb:    document.getElementById('siteWeb').value.trim(),
    cabinet:    document.getElementById('cabinet').value.trim(),
    rpps:       document.getElementById('rppsInput').value.trim(),
    specialite: document.getElementById('specialite').value,
    adeli:      '',
    formule:    selectedFormule || document.getElementById('formuleHidden').value || 'essentiel',
  };

  const btn = document.querySelector('#inscriptionForm .btn-submit');
  if (btn) { btn.textContent = 'Création en cours…'; btn.disabled = true; }

  // ── Mode Supabase ──────────────────────────────────────────
  if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA && typeof inscrireDieteticien !== 'undefined') {
    const result = await inscrireDieteticien(payload);

    if (result && result.error) {
      const msg = result.error.message || 'Erreur lors de l\\'inscription.';
      alert('Erreur : ' + msg);
      if (btn) { btn.textContent = 'Créer mon compte →'; btn.disabled = false; }
      return;
    }

    // Succès Supabase
    document.getElementById('inscriptionForm').style.display = 'none';
    document.getElementById('inscriptionConfirmation').classList.remove('hidden');
    setTimeout(() => {
      if (typeof clearCurrentDraft === 'function') clearCurrentDraft('inscriptionForm');
    }, 500);
    return;
  }

  // ── Fallback localStorage (mode démo) ─────────────────────
  localStorage.setItem('nutridoc_dieteticien', JSON.stringify({
    ...payload, statut: 'actif', created_at: new Date().toISOString()
  }));
  document.getElementById('inscriptionForm').style.display = 'none';
  document.getElementById('inscriptionConfirmation').classList.remove('hidden');
  setTimeout(() => {
    if (typeof clearCurrentDraft === 'function') clearCurrentDraft('inscriptionForm');
  }, 500);
});"""

if old_handler in content:
    content = content.replace(old_handler, new_handler)
    with open('inscription-dieteticien.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCES : handler de soumission mis a jour avec appel Supabase.")
else:
    print("ERREUR : pattern non trouve. Le fichier a peut-etre deja ete corrige,")
    print("ou il contient des espaces/retours differents.")
    print("Verifiez manuellement les lignes 1072-1109.")
