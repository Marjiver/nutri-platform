let currentInscStep = 1;
const totalInscSteps = 3;

function showInscStep(n) {
  document.querySelectorAll('.insc-step').forEach(s => s.classList.remove('active'));
  document.querySelector('.insc-step[data-step="' + n + '"]').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function nextInscStep() {
  if (!validateStep(currentInscStep)) return;
  if (currentInscStep < totalInscSteps) { currentInscStep++; showInscStep(currentInscStep); }
}
function prevInscStep() {
  if (currentInscStep > 1) { currentInscStep--; showInscStep(currentInscStep); }
}

function validateStep(step) {
  if (step === 1) {
    if (!document.getElementById('prenom').value.trim() || !document.getElementById('nom').value.trim()) { showError('Veuillez renseigner votre prénom et nom.'); return false; }
    const email = document.getElementById('email').value.trim();
    if (!email || !email.includes('@')) { showError('Veuillez entrer un email valide.'); return false; }
  }
  if (step === 2) {
    if (getRppsRaw().length !== 11) { showError('Le numéro RPPS doit contenir exactement 11 chiffres.'); return false; }
    if (!document.getElementById('specialite').value) { showError('Veuillez sélectionner votre spécialité.'); return false; }
  }
  return true;
}

function showError(msg) {
  document.querySelector('.insc-error')?.remove();
  const div = document.createElement('div');
  div.className = 'insc-error';
  div.textContent = msg;
  const activeStep = document.querySelector('.insc-step.active');
  const target = activeStep.querySelector('.btn-row') || activeStep.querySelector('button[type="button"]');
  activeStep.insertBefore(div, target);
  setTimeout(() => div.remove(), 4000);
}

// ── Aperçu coordonnées en temps réel ────────────────────────────────────────
function updatePreview() {
  const prenom  = document.getElementById('prenom').value.trim();
  const nom     = document.getElementById('nom').value.trim();
  const cabinet = document.getElementById('cabinet')?.value.trim();
  const tel     = document.getElementById('tel').value.trim();
  const site    = document.getElementById('siteWeb')?.value.trim();

  document.getElementById('prevNom').textContent     = (prenom || 'Prénom') + ' ' + (nom ? nom.toUpperCase() : 'NOM');
  document.getElementById('prevCabinet').textContent = cabinet || '';
  const contact = [tel, site].filter(Boolean).join(' · ');
  document.getElementById('prevContact').textContent = contact || 'coordonnées@cabinet.fr';

  document.getElementById('coordPreview').style.opacity = (prenom || nom) ? '1' : '0.4';
}

// ── RPPS ────────────────────────────────────────────────────────────────────
function getRppsRaw() {
  return (document.getElementById('rppsInput').value || '').replace(/\s/g, '');
}
function formatRpps(input) {
  let raw = input.value.replace(/\D/g, '').slice(0, 11);
  let f = raw;
  if (raw.length > 2) f = raw.slice(0,2) + ' ' + raw.slice(2);
  if (raw.length > 5) f = raw.slice(0,2) + ' ' + raw.slice(2,5) + ' ' + raw.slice(5);
  if (raw.length > 8) f = raw.slice(0,2) + ' ' + raw.slice(2,5) + ' ' + raw.slice(5,8) + ' ' + raw.slice(8);
  input.value = f;
  const status = document.getElementById('rppsStatus');
  document.getElementById('rppsFeedback').textContent = '';
  status.innerHTML = raw.length === 11
    ? '<span class="rpps-ok">✓ Format valide</span>'
    : '<span class="rpps-hint">' + raw.length + ' / 11</span>';
}
function verifierRpps() {
  if (!validateStep(2)) return;
  const btn = document.getElementById('btnVerifRpps');
  const feedback = document.getElementById('rppsFeedback');
  btn.textContent = 'Vérification…';
  btn.disabled = true;
  setTimeout(() => {
    const rpps = getRppsRaw();
    const prenom = document.getElementById('prenom').value.trim();
    const nom    = document.getElementById('nom').value.trim();
    if (rpps.startsWith('00')) {
      feedback.innerHTML = '<span class="rpps-error">✗ Numéro RPPS introuvable. Vérifiez votre saisie.</span>';
      btn.textContent = 'Vérifier & continuer →';
      btn.disabled = false;
      return;
    }
    feedback.innerHTML = '<span class="rpps-ok">✓ RPPS vérifié — ' + prenom + ' ' + nom.toUpperCase() + ' enregistré(e)</span>';
    setTimeout(() => { currentInscStep = 3; showInscStep(3); btn.textContent = 'Vérifier & continuer →'; btn.disabled = false; }, 800);
  }, 1600);
}

// ── Formule — highlight carte sélectionnée ──────────────────────────────────
function updateCardSelection() {
  document.querySelectorAll('.plan-choice-card').forEach(card => card.classList.remove('selected'));
  const checked = document.querySelector('input[name="formule"]:checked');
  if (checked) checked.closest('.plan-choice-card').classList.add('selected');
}

// ── Mot de passe ─────────────────────────────────────────────────────────────
function checkPwd(val) {
  const bar = document.getElementById('pwdStrength');
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
function togglePwd() {
  const inp = document.getElementById('password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Aperçu coordonnées
  ['prenom','nom','tel','cabinet','siteWeb'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePreview);
  });
  updatePreview();

  // Sélection formule
  document.querySelectorAll('input[name="formule"]').forEach(r => r.addEventListener('change', updateCardSelection));
  updateCardSelection();

  // Soumission
  document.getElementById('inscriptionForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!validateStep(3)) return;
    if (document.getElementById('password').value !== document.getElementById('passwordConfirm').value) { showError('Les mots de passe ne correspondent pas.'); return; }
    if (document.getElementById('password').value.length < 8) { showError('Mot de passe trop court (8 caractères minimum).'); return; }
    if (!document.getElementById('cgu').checked) { showError('Veuillez accepter les CGU.'); return; }

    const profil = {
      prenom:     document.getElementById('prenom').value.trim(),
      nom:        document.getElementById('nom').value.trim(),
      email:      document.getElementById('email').value.trim(),
      tel:        document.getElementById('tel').value.trim(),
      siteWeb:    document.getElementById('siteWeb')?.value.trim(),
      cabinet:    document.getElementById('cabinet')?.value.trim(),
      rpps:       getRppsRaw(),
      specialite: document.getElementById('specialite').value,
      adeli:      document.getElementById('adeli').value.trim(),
      formule:    document.querySelector('input[name="formule"]:checked').value,
      statut:     'en_attente_validation',
      date:       new Date().toISOString()
    };
    localStorage.setItem('nutri_dieteticien', JSON.stringify(profil));
    document.getElementById('inscriptionForm').classList.add('hidden');
    document.getElementById('inscriptionConfirmation').classList.remove('hidden');
  });
});
