/**
 * queue.js — NutriDoc
 * Gestion de la file d'attente des demandes de plans alimentaires
 *
 * Architecture :
 *   1. Le client soumet une demande → insérée dans queue_plans (statut: pending)
 *   2. Rate limiting côté client : 1 demande / 30s max (token bucket simplifié)
 *   3. Un Edge Function cron (1min) dispatche les demandes aux diét. dispos
 *   4. Métriques : délai moyen, taux de saturation calculés en temps réel
 *   5. Notifications : Supabase Realtime + email (résumé dans queueManager)
 */

// ── Rate limiter client (token bucket) ───────────────────────
const RateLimiter = (() => {
  const WINDOW_MS = 60_000; // 1 minute
  const MAX_REQ   = 3;      // 3 demandes max par fenêtre
  const KEY       = 'nutridoc_rl';

  return {
    canSubmit() {
      const now     = Date.now();
      const stored  = JSON.parse(localStorage.getItem(KEY) || '{"tokens":[],"last":0}');
      // Purger les tokens expirés
      stored.tokens = stored.tokens.filter(t => now - t < WINDOW_MS);
      if (stored.tokens.length >= MAX_REQ) {
        const waitMs  = WINDOW_MS - (now - stored.tokens[0]);
        return { allowed: false, waitSec: Math.ceil(waitMs / 1000) };
      }
      return { allowed: true };
    },
    consume() {
      const now    = Date.now();
      const stored = JSON.parse(localStorage.getItem(KEY) || '{"tokens":[]}');
      stored.tokens.push(now);
      localStorage.setItem(KEY, JSON.stringify(stored));
    }
  };
})();

// ── Queue manager ─────────────────────────────────────────────
const QueueManager = {
  // ── Soumettre une demande ──────────────────────────────────
  async soumettre({ patientId, patientPrenom, ville, objectif, bilanId, type = 'plan' }) {
    const rl = RateLimiter.canSubmit();
    if (!rl.allowed) {
      return { error: `Trop de demandes. Réessayez dans ${rl.waitSec} secondes.` };
    }

    const demande = {
      patient_id:     patientId  || 'demo',
      patient_prenom: patientPrenom || 'Patient',
      ville:          ville || '',
      objectif,
      bilan_id:       bilanId || null,
      type,
      statut:         'pending',
      priorite:       1,
      created_at:     new Date().toISOString(),
      expires_at:     new Date(Date.now() + 48 * 3_600_000).toISOString(), // 48h ouvrées
      tentatives:     0,
      dietitian_id:   null,
      accepted_at:    null,
      delivered_at:   null,
    };

    RateLimiter.consume();

    // Supabase si dispo, sinon localStorage
    if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA && window._supa) {
      const { data, error } = await window._supa
        .from('queue_plans')
        .insert(demande)
        .select()
        .single();
      if (error) return { error: error.message };
      return { data, position: await this.getPosition(data.id) };
    } else {
      const queue = JSON.parse(localStorage.getItem('nutridoc_queue') || '[]');
      demande.id  = 'local_' + Date.now();
      queue.push(demande);
      localStorage.setItem('nutridoc_queue', JSON.stringify(queue));
      return { data: demande, position: queue.filter(d => d.statut === 'pending').length };
    }
  },

  // ── Position dans la file ──────────────────────────────────
  async getPosition(demandeId) {
    if (typeof MODE_SUPA !== 'undefined' && MODE_SUPA && window._supa) {
      const { count } = await window._supa
        .from('queue_plans')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'pending')
        .lt('created_at', new Date().toISOString());
      return count || 1;
    }
    const queue = JSON.parse(localStorage.getItem('nutridoc_queue') || '[]');
    const idx   = queue.findIndex(d => d.id === demandeId);
    return idx >= 0 ? idx + 1 : 1;
  },

  // ── Métriques file d'attente ───────────────────────────────
  getMetrics() {
    const queue      = JSON.parse(localStorage.getItem('nutridoc_queue') || '[]');
    const now        = Date.now();
    const pending    = queue.filter(d => d.statut === 'pending');
    const delivered  = queue.filter(d => d.statut === 'delivered' && d.delivered_at);

    // Délai moyen (sur les livrées)
    const delays     = delivered
      .map(d => new Date(d.delivered_at) - new Date(d.created_at))
      .filter(ms => ms > 0);
    const avgDelayMs = delays.length
      ? delays.reduce((a, b) => a + b, 0) / delays.length
      : 12 * 3_600_000; // défaut 12h si pas de données

    // Taux de saturation : pending / capacité max théorique (10 plans/diét/48h × nb diéts)
    const NB_DIETS_ACTIFS = 5;       // à brancher sur Supabase
    const CAPACITE_48H    = NB_DIETS_ACTIFS * 10;
    const saturation      = Math.min(100, Math.round((pending.length / CAPACITE_48H) * 100));

    // Estimation délai pour un nouveau patient
    const delaiEstimeH = Math.round(avgDelayMs / 3_600_000 * (1 + saturation / 100));

    return {
      pending:         pending.length,
      delivered:       delivered.length,
      avgDelayH:       Math.round(avgDelayMs / 3_600_000),
      saturation,      // 0-100 %
      delaiEstimeH:    Math.min(48, delaiEstimeH),
      capacite:        CAPACITE_48H,
      status:          saturation < 60 ? 'nominal' : saturation < 85 ? 'chargé' : 'saturé'
    };
  },

  // ── Dispatcher (simule le worker côté client en mode démo) ──
  dispatcher() {
    const queue = JSON.parse(localStorage.getItem('nutridoc_queue') || '[]');
    const pending = queue.filter(d => d.statut === 'pending');
    pending.forEach(d => {
      // Simuler attribution après 2s en démo
      const age = Date.now() - new Date(d.created_at).getTime();
      if (age > 2000) { d.statut = 'accepted'; d.accepted_at = new Date().toISOString(); d.dietitian_id = 'demo_diet'; }
    });
    localStorage.setItem('nutridoc_queue', JSON.stringify(queue));
  }
};

// ── Composant UI : widget file d'attente ──────────────────────
function renderQueueWidget(containerId) {
  const metrics = QueueManager.getMetrics();
  const el      = document.getElementById(containerId);
  if (!el) return;

  const statusColors = { nominal: '#1D9E75', chargé: '#f59e0b', saturé: '#ef4444' };
  const statusColor  = statusColors[metrics.status] || '#1D9E75';

  el.innerHTML = `
    <div class="queue-widget">
      <div class="queue-status-row">
        <div class="queue-status-dot" style="background:${statusColor};box-shadow:0 0 0 4px ${statusColor}22;"></div>
        <span class="queue-status-label">File d'attente — <strong style="color:${statusColor}">${metrics.status}</strong></span>
        <span class="queue-refresh" onclick="renderQueueWidget('${containerId}')" title="Actualiser">↻</span>
      </div>
      <div class="queue-metrics-row">
        <div class="queue-metric">
          <div class="queue-metric-val">${metrics.pending}</div>
          <div class="queue-metric-label">Demandes en attente</div>
        </div>
        <div class="queue-metric">
          <div class="queue-metric-val">${metrics.delaiEstimeH}h</div>
          <div class="queue-metric-label">Délai estimé</div>
        </div>
        <div class="queue-metric">
          <div class="queue-metric-val">${metrics.saturation}%</div>
          <div class="queue-metric-label">Taux de saturation</div>
        </div>
      </div>
      <div class="queue-sat-bar">
        <div class="queue-sat-fill" style="width:${metrics.saturation}%;background:${statusColor};"></div>
      </div>
      ${metrics.saturation >= 85 ? `<div class="queue-alert">Capacité proche du maximum. Votre délai peut dépasser 48h. Nous vous notifierons dès qu'un diét. est disponible.</div>` : ''}
    </div>`;
}

// ── Composant UI : bouton soumettre avec feedback ─────────────
async function soumettreDemandeUI(config) {
  const btn = document.getElementById(config.btnId);
  const fb  = document.getElementById(config.feedbackId);
  if (!btn) return;

  btn.disabled    = true;
  btn.textContent = 'Envoi en cours…';

  const result = await QueueManager.soumettre(config.data);

  if (result.error) {
    fb.innerHTML  = `<div class="step-error">${result.error}</div>`;
    btn.disabled  = false;
    btn.textContent = config.btnLabel || 'Soumettre';
    return;
  }

  const metrics = QueueManager.getMetrics();
  fb.innerHTML = `
    <div class="queue-success">
      <div class="queue-success-icon">✓</div>
      <div>
        <strong>Demande enregistrée</strong> — Position ${result.position} dans la file<br>
        <span style="font-size:.78rem;color:var(--gray);">Délai estimé : ${metrics.delaiEstimeH}h · Saturation : ${metrics.saturation}%</span>
      </div>
    </div>`;
  btn.textContent = 'Demande envoyée';
}
