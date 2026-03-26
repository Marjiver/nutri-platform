let currentPrescStep = 1;
const totalPrescSteps = 3;

function showPrescStep(n) {
  document.querySelectorAll('#inscriptionPrescForm .insc-step').forEach(s => s.classList.remove('active'));
  document.querySelector('#inscriptionPrescForm .insc-step[data-step="' + n + '"]').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (!email || !email.includes('@')) { showPrescError('Veuillez entrer un email valide.'); return false; }
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
  const activeStep = document.querySelector('#inscriptionPrescForm .insc-step.active');
  const target = activeStep.querySelector('.btn-row') || activeStep.querySelector('button');
  activeStep.insertBefore(div, target);
  setTimeout(() => div.remove(), 4000);
}

// Aperçu coordonnées
function updatePrescPreview() {
  const prenom    = document.getElementById('pPrenom')?.value.trim() || '';
  const nom       = document.getElementById('pNom')?.value.trim() || '';
  const profession = document.getElementById('pProfession')?.value || '';
  const cabinet   = document.getElementById('pCabinet')?.value.trim() || '';
  const tel       = document.getElementById('pTel')?.value.trim() || '';
  const site      = document.getElementById('pSite')?.value.trim() || '';

  const titres = { coach_sportif: 'Coach sportif certifié', preparateur: 'Préparateur physique', kine: 'Kinésithérapeute DE' };

  document.getElementById('pPrevNom').textContent    = (prenom || 'Prénom') + ' ' + (nom ? nom.toUpperCase() : 'NOM');
  document.getElementById('pPrevTitre').textContent  = titres[profession] || 'Professionnel du sport et de la santé';
  document.getElementById('pPrevCabinet').textContent = cabinet;
  document.getElementById('pPrevContact').textContent = [tel, site].filter(Boolean).join(' · ') || 'coordonnées@pro.fr';
  document.getElementById('pCoordPreview').style.opacity = (prenom || nom) ? '1' : '0.4';
}

// Pack highlight
function updatePackSelection() {
  document.querySelectorAll('.plan-choice-card').forEach(c => c.classList.remove('selected'));
  const checked = document.querySelector('input[name="pPack"]:checked');
  if (checked) checked.closest('.plan-choice-card').classList.add('selected');
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
    '<div class="pwd-bar"><div class="pwd-fill" style="width:' + (score*25) + '%;background:' + colors[score] + '"></div></div>' +
    '<span style="font-size:0.75rem;color:' + colors[score] + '">' + labels[score] + '</span>';
}
function togglePwdP() {
  const inp = document.getElementById('pPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

document.addEventListener('DOMContentLoaded', () => {
  ['pPrenom','pNom','pProfession','pTel','pCabinet','pSite'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePrescPreview);
  });
  updatePrescPreview();

  document.querySelectorAll('input[name="pPack"]').forEach(r => r.addEventListener('change', updatePackSelection));
  updatePackSelection();

  document.getElementById('inscriptionPrescForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!validatePrescStep(3)) return;
    if (document.getElementById('pPassword').value !== document.getElementById('pPasswordConfirm').value) { showPrescError('Les mots de passe ne correspondent pas.'); return; }
    if (document.getElementById('pPassword').value.length < 8) { showPrescError('Mot de passe trop court.'); return; }
    if (!document.getElementById('pCgu').checked) { showPrescError('Veuillez accepter les CGU et la charte prescripteur.'); return; }

    const objectifs = Array.from(document.querySelectorAll('input[name="pObjectif"]:checked')).map(c => c.value);
    const profil = {
      type: 'prescripteur',
      prenom:     document.getElementById('pPrenom').value.trim(),
      nom:        document.getElementById('pNom').value.trim(),
      profession: document.getElementById('pProfession').value,
      email:      document.getElementById('pEmail').value.trim(),
      tel:        document.getElementById('pTel').value.trim(),
      site:       document.getElementById('pSite').value.trim(),
      cabinet:    document.getElementById('pCabinet').value.trim(),
      certif:     document.getElementById('pCertif').value.trim(),
      objectifs,
      pack:       document.querySelector('input[name="pPack"]:checked').value,
      credits:    parseInt(document.querySelector('input[name="pPack"]:checked').value),
      statut:     'actif',
      date:       new Date().toISOString()
    };
    localStorage.setItem('nutri_prescripteur', JSON.stringify(profil));
    document.getElementById('inscriptionPrescForm').classList.add('hidden');
    document.getElementById('prescConfirmation').classList.remove('hidden');
  });
});
