/**
 * support.js — Widget ticket support universel
 * S'intègre dans tous les espaces (patient, diét, prescripteur)
 * Usage : <div id="supportWidget"></div> + initSupportWidget('supportWidget', role)
 */

const CATEGORIES = {
  patient: [
    { val: 'bilan',       label: 'Problème avec le formulaire bilan' },
    { val: 'plan',        label: 'Plan non reçu ou incomplet' },
    { val: 'paiement',    label: 'Problème de paiement' },
    { val: 'compte',      label: 'Accès à mon compte' },
    { val: 'data',        label: 'Mes données personnelles (RGPD)' },
    { val: 'autre',       label: 'Autre' },
  ],
  dietitian: [
    { val: 'dossier',     label: 'Problème sur un dossier patient' },
    { val: 'notification',label: 'Je ne reçois pas les notifications' },
    { val: 'remuneration',label: 'Rémunération ou facturation' },
    { val: 'rpps',        label: 'Vérification RPPS' },
    { val: 'agenda',      label: 'Agenda visios' },
    { val: 'compte',      label: 'Accès à mon compte' },
    { val: 'autre',       label: 'Autre dysfonctionnement' },
  ],
  prescriber: [
    { val: 'credits',     label: 'Crédits non crédités' },
    { val: 'plan',        label: 'Plan non livré dans les délais' },
    { val: 'siret',       label: 'Vérification SIRET' },
    { val: 'crm',         label: 'Problème CRM clients' },
    { val: 'facturation', label: 'Facturation ou remboursement' },
    { val: 'compte',      label: 'Accès à mon compte' },
    { val: 'autre',       label: 'Autre' },
  ]
};

function initSupportWidget(containerId, role = 'patient') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const tickets = JSON.parse(localStorage.getItem('nutridoc_tickets_' + role) || '[]');
  const cats    = CATEGORIES[role] || CATEGORIES.patient;

  el.innerHTML = `
    <div class="support-widget">
      <div class="support-header">
        <div class="support-header-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.2"/>
            <path d="M6 6.5C6 5.4 6.9 4.5 8 4.5s2 .9 2 2c0 1.5-2 2-2 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            <circle cx="8" cy="12" r=".7" fill="currentColor"/>
          </svg>
          Support
        </div>
        <button class="support-toggle" id="supportToggle_${containerId}" onclick="toggleSupport('${containerId}')">
          Signaler un problème
        </button>
      </div>

      <!-- Formulaire (caché par défaut) -->
      <div class="support-form-wrap hidden" id="supportForm_${containerId}">
        <div class="form-group" style="margin-top:.75rem;">
          <label>Catégorie <span class="req">*</span></label>
          <select id="sCat_${containerId}" class="calc-select" style="width:100%">
            <option value="">— Choisir —</option>
            ${cats.map(c => `<option value="${c.val}">${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Titre <span class="req">*</span></label>
          <input type="text" id="sTitre_${containerId}" placeholder="Résumé court du problème" style="width:100%"/>
        </div>
        <div class="form-group">
          <label>Description <span class="req">*</span></label>
          <textarea id="sDesc_${containerId}" placeholder="Décrivez le problème en détail : étapes pour reproduire, message d'erreur, date et heure..." style="width:100%;min-height:80px;"></textarea>
        </div>
        <div class="form-group">
          <label>Priorité</label>
          <div class="radio-group" style="flex-direction:row;flex-wrap:wrap;gap:.4rem;">
            <label class="radio-option" style="padding:4px 10px;flex:none;">
              <input type="radio" name="sPrio_${containerId}" value="basse"/><span>Basse</span>
            </label>
            <label class="radio-option" style="padding:4px 10px;flex:none;">
              <input type="radio" name="sPrio_${containerId}" value="normale" checked/><span>Normale</span>
            </label>
            <label class="radio-option" style="padding:4px 10px;flex:none;">
              <input type="radio" name="sPrio_${containerId}" value="haute"/><span>Haute</span>
            </label>
            <label class="radio-option" style="padding:4px 10px;flex:none;">
              <input type="radio" name="sPrio_${containerId}" value="urgente"/><span style="color:#ef4444;">Urgente</span>
            </label>
          </div>
        </div>
        <div id="supportError_${containerId}" class="step-error hidden"></div>
        <div style="display:flex;gap:.75rem;margin-top:.75rem;">
          <button class="btn-validate" onclick="soumettreTicket('${containerId}','${role}')">Envoyer le ticket →</button>
          <button class="btn-back" onclick="toggleSupport('${containerId}')">Annuler</button>
        </div>
      </div>

      <!-- Historique tickets -->
      ${tickets.length > 0 ? `
        <div class="support-history" id="supportHistory_${containerId}">
          <div style="font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:var(--gray);margin:1rem 0 .5rem;">Mes tickets</div>
          ${tickets.map(t => `
            <div class="support-ticket-row">
              <div class="support-ticket-status ${t.statut}"></div>
              <div class="support-ticket-info">
                <div style="font-size:.82rem;font-weight:500;">${t.titre}</div>
                <div style="font-size:.72rem;color:var(--gray);">${t.categorie} · ${new Date(t.created_at).toLocaleDateString('fr-FR')} · <span class="support-statut-label ${t.statut}">${{ouvert:'Ouvert',en_cours:'En cours',resolu:'Résolu',ferme:'Fermé'}[t.statut]||t.statut}</span></div>
              </div>
            </div>`).join('')}
        </div>` : ''}
    </div>`;
}

function toggleSupport(id) {
  const form   = document.getElementById('supportForm_' + id);
  const toggle = document.getElementById('supportToggle_' + id);
  const isOpen = form.classList.toggle('hidden');
  toggle.textContent = isOpen ? 'Signaler un problème' : '✕ Fermer';
}

async function soumettreTicket(id, role) {
  const cat    = document.getElementById('sCat_'   + id)?.value;
  const titre  = document.getElementById('sTitre_' + id)?.value.trim();
  const desc   = document.getElementById('sDesc_'  + id)?.value.trim();
  const prio   = document.querySelector(`input[name="sPrio_${id}"]:checked`)?.value || 'normale';
  const errEl  = document.getElementById('supportError_' + id);

  if (!cat || !titre || !desc) {
    errEl.textContent = 'Veuillez remplir tous les champs obligatoires.';
    errEl.classList.remove('hidden');
    setTimeout(() => errEl.classList.add('hidden'), 4000);
    return;
  }

  const ticket = {
    id:          'TKT-' + Date.now(),
    categorie:   cat,
    titre,
    description: desc,
    priorite:    prio,
    statut:      'ouvert',
    created_at:  new Date().toISOString(),
    user_role:   role
  };

  // Sauvegarder en Supabase ou localStorage
  if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA && window._supa) {
    const user = await getUser();
    await window._supa.from('support_tickets').insert({
      ...ticket,
      user_id:    user?.id,
      user_email: user?.email
    });
  } else {
    const tickets = JSON.parse(localStorage.getItem('nutridoc_tickets_' + role) || '[]');
    tickets.unshift(ticket);
    localStorage.setItem('nutridoc_tickets_' + role, JSON.stringify(tickets));
  }

  // Email simulé à contact@calidocsante.fr
  console.info(`[NutriDoc Support] Ticket ${ticket.id} soumis → contact@calidocsante.fr`, ticket);

  // Rafraîchir le widget
  const container = document.getElementById(id)?.closest('[id]');
  if (container) {
    document.getElementById(id).innerHTML = `
      <div class="support-widget">
        <div class="support-header">
          <div class="support-header-title">Support</div>
        </div>
        <div class="queue-success" style="margin-top:.75rem;">
          <div class="queue-success-icon">✓</div>
          <div>
            <strong>Ticket envoyé — ${ticket.id}</strong><br>
            <span style="font-size:.78rem;color:var(--gray);">Nous vous répondrons sous 24h à contact@calidocsante.fr · Priorité : ${prio}</span>
          </div>
        </div>
      </div>`;
  }
}
