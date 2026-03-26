let currentPrescStep = 1;
const totalPrescSteps = 3;
let packSelectionne = '20';

const PACKS = {
  '10': 'Découverte — 10 crédits · 49 € HT',
  '20': 'Pro — 20 crédits · 89 € HT',
  '50': 'Volume — 50 crédits · 219 € HT'
};
const PACK_CARDS = { '10':'packCard10', '20':'packCard20', '50':'packCard50' };

function selectPack(pack, el) {
  packSelectionne = pack;
  document.querySelectorAll('.pricing-diet-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const recap = document.getElementById('pPackRecapName');
  const hidden = document.getElementById('pPackHidden');
  if (recap)  recap.textContent = PACKS[pack];
  if (hidden) hidden.value = pack;
}

function scrollToPacks() {
  document.getElementById('packCard10')?.scrollIntoView({ behavior:'smooth', block:'center' });
}

function showPrescStep(n) {
  document.querySelectorAll('#inscriptionPrescForm .insc-step').forEach(s => s.classList.remove('active'));
  document.querySelector('#inscriptionPrescForm .insc-step[data-step="'+n+'"]')?.classList.add('active');
  for (let i = 1; i <= totalPrescSteps; i++) {
    const el = document.getElementById('pProgStep'+i);
    if (!el) continue;
    el.classList.remove('active','done');
    if (i === n) el.classList.add('active');
    else if (i < n) el.classList.add('done');
  }
  window.scrollTo({ top: document.getElementById('formulaireSection')?.offsetTop - 80 || 0, behavior:'smooth' });
}

function nextPrescStep() {
  if (!validatePrescStep(currentPrescStep)) return;
  if (currentPrescStep < totalPrescSteps) { currentPrescStep++; showPrescStep(currentPrescStep); }
}
function prevPrescStep() {
  if (currentPrescStep > 1) { currentPrescStep--; showPrescStep(currentPrescStep); }
}

function validatePrescStep(step) {
  if (step === 1) {
    if (!document.getElementById('pPrenom').value.trim() || !document.getElementById('pNom').value.trim()) { showPrescError('Veuillez renseigner votre prénom et nom.'); return false; }
    if (!document.getElementById('pProfession').value) { showPrescError('Veuillez sélectionner votre profession.'); return false; }
    const email = document.getElementById('pEmail').value.trim();
    if (!email || !email.includes('@')) { showPrescError('Email invalide.'); return false; }
  }
  if (step === 2) {
    const checked = document.querySelectorAll('input[name="pObjectif"]:checked');
    if (checked.length === 0) { showPrescError('Veuillez sélectionner au moins un objectif.'); return false; }
  }
  return true;
}

function showPrescError(msg) {
  document.querySelector('.insc-error')?.remove();
  const div = document.createElement('div');
  div.className = 'insc-error';
  div.textContent = msg;
  const step = document.querySelector('#inscriptionPrescForm .insc-step.active');
  const target = step?.querySelector('.btn-row') || step?.querySelector('button');
  if (target) step.insertBefore(div, target);
  setTimeout(() => div.remove(), 4000);
}

function updatePrescPreview() {
  const prenom    = document.getElementById('pPrenom')?.value.trim() || '';
  const nom       = document.getElementById('pNom')?.value.trim() || '';
  const profession = document.getElementById('pProfession')?.value || '';
  const cabinet   = document.getElementById('pCabinet')?.value.trim() || '';
  const tel       = document.getElementById('pTel')?.value.trim() || '';
  const site      = document.getElementById('pSite')?.value.trim() || '';
  const titres    = { coach_sportif:'Coach sportif certifié', preparateur:'Préparateur physique', kine:'Kinésithérapeute DE', autre:'Professionnel du sport et de la santé' };
  document.getElementById('pPrevNom').textContent     = (prenom||'Prénom') + ' ' + (nom ? nom.toUpperCase() : 'NOM');
  document.getElementById('pPrevTitre').textContent   = titres[profession] || 'Professionnel du sport et de la santé';
  document.getElementById('pPrevCabinet').textContent = cabinet;
  document.getElementById('pPrevContact').textContent = [tel, site].filter(Boolean).join(' · ') || '';
  document.getElementById('pCoordPreview').style.opacity = (prenom||nom) ? '1' : '0.4';
}

function checkPwdP(val) {
  const bar = document.getElementById('pPwdStrength');
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const labels = ['','Faible','Moyen','Fort','Très fort'];
  const colors = ['','#ef4444','#f97316','#22c55e','#16a34a'];
  bar.innerHTML = val.length === 0 ? '' :
    '<div class="pwd-bar"><div class="pwd-fill" style="width:'+(score*25)+'%;background:'+colors[score]+'"></div></div>' +
    '<span style="font-size:.75rem;color:'+colors[score]+'">'+labels[score]+'</span>';
}
function togglePwdP() {
  const inp = document.getElementById('pPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

document.addEventListener('DOMContentLoaded', () => {
  selectPack('20', document.getElementById('packCard20'));
  ['pPrenom','pNom','pProfession','pTel','pCabinet','pSite'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePrescPreview);
  });
  updatePrescPreview();

  document.getElementById('inscriptionPrescForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!validatePrescStep(3)) return;
    if (document.getElementById('pPassword').value !== document.getElementById('pPasswordConfirm').value) { showPrescError('Les mots de passe ne correspondent pas.'); return; }
    if (document.getElementById('pPassword').value.length < 8) { showPrescError('Mot de passe trop court.'); return; }
    if (!document.getElementById('pCgu').checked) { showPrescError('Veuillez accepter les CGU.'); return; }

    const btn = document.querySelector('#inscriptionPrescForm .btn-submit');
    btn.textContent = 'Création en cours…'; btn.disabled = true;

    const objectifs = Array.from(document.querySelectorAll('input[name="pObjectif"]:checked')).map(c => c.value);
    const payload = {
      email: document.getElementById('pEmail').value.trim(),
      password: document.getElementById('pPassword').value,
      prenom: document.getElementById('pPrenom').value.trim(),
      nom: document.getElementById('pNom').value.trim(),
      profession: document.getElementById('pProfession').value,
      tel: document.getElementById('pTel').value.trim(),
      site: document.getElementById('pSite').value.trim(),
      cabinet: document.getElementById('pCabinet').value.trim(),
      certif: document.getElementById('pCertif').value.trim(),
      objectifs,
      pack: packSelectionne
    };

    if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA) {
      const { error } = await inscrirePrescripteur(payload);
      if (error) { showPrescError(error.message || 'Erreur inscription.'); btn.textContent='Créer mon compte →'; btn.disabled=false; return; }
    } else {
      localStorage.setItem('nutri_prescripteur', JSON.stringify({ ...payload, credits: parseInt(packSelectionne), statut:'actif' }));
    }

    document.getElementById('inscriptionPrescForm').classList.add('hidden');
    document.getElementById('prescConfirmation').classList.remove('hidden');
  });
});
