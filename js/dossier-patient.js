/**
 * dossier-patient.js — Modal de visualisation complète d'un dossier patient
 * Appelé depuis l'espace diététicien
 */
function ouvrirDossier(id) {
  // Chercher dans PATIENTS (défini dans dietitian.html)
  const p = (typeof PATIENTS !== 'undefined' ? PATIENTS : []).find(x => x.id === id);
  if (!p) return;

  const obj = (typeof OBJECTIFS !== 'undefined' ? OBJECTIFS : []).find(o => o.val === p.objectif);
  const imc = p.poids && p.taille ? (p.poids / Math.pow(p.taille/100, 2)).toFixed(1) : '—';

  const alertes = p.alertes_sante || p.redflags || [];

  const modal = document.createElement('div');
  modal.id = 'dossierModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(13,32,24,.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);';

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:700px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.2);">
      <!-- Header -->
      <div style="background:#0d2018;padding:1.25rem 1.5rem;border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:.75rem;">
          <div style="width:44px;height:44px;border-radius:50%;background:${p.avatar||'#1D9E75'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:600;">${(p.prenom||'?')[0]}${(p.nom||'?')[0]}</div>
          <div>
            <div style="color:#fff;font-size:1rem;font-weight:500;">${p.prenom} ${p.nom} · ${p.age} ans</div>
            <div style="color:rgba(255,255,255,.5);font-size:.75rem;">📍 ${p.ville} · IMC ${imc} · ${obj?.label||p.objectif}</div>
          </div>
        </div>
        <button onclick="document.getElementById('dossierModal').remove()" style="background:rgba(255,255,255,.1);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.1rem;">×</button>
      </div>

      <div style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:1rem;">

        ${alertes.length ? `
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:.75rem 1rem;">
          <div style="font-size:.8rem;font-weight:600;color:#dc2626;margin-bottom:.35rem;">🚨 Alertes santé détectées</div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap;">${alertes.map(f=>`<span style="background:#fee2e2;color:#dc2626;font-size:.72rem;padding:2px 8px;border-radius:999px;">${f}</span>`).join('')}</div>
          <div style="font-size:.72rem;color:#dc2626;margin-top:.5rem;">Seul un diététicien-nutritionniste ou médecin nutritionniste est habilité à prendre en charge ce type de suivi.</div>
        </div>` : ''}

        <!-- Métriques -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;">
          ${[['Poids','${p.poids||"—"} kg'],['Taille','${p.taille||"—"} cm'],['IMC',imc],['Objectif',obj?.icon+' '+(obj?.label||p.objectif)]].map(([l,v])=>`
          <div style="background:#f7f9f7;border-radius:8px;padding:.6rem .8rem;text-align:center;">
            <div style="font-size:.65rem;color:#6b7b74;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.2rem;">${l}</div>
            <div style="font-size:.9rem;font-weight:500;color:#0d2018;">${v}</div>
          </div>`).join('')}
        </div>

        <!-- Coordonnées -->
        <div>
          <div style="font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:#6b7b74;margin-bottom:.5rem;">Coordonnées</div>
          <div style="display:flex;flex-wrap:wrap;gap:.75rem;font-size:.82rem;">
            <span>📧 <a href="mailto:${p.email}" style="color:#1D9E75;">${p.email}</a></span>
            <span>📞 <a href="tel:${p.tel}" style="color:#1D9E75;">${p.tel}</a></span>
          </div>
        </div>

        <!-- Informations bilan -->
        <div>
          <div style="font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:#6b7b74;margin-bottom:.5rem;">Profil nutritionnel</div>
          <div style="background:#f7f9f7;border-radius:10px;overflow:hidden;">
            ${[
              ['Régime', p.regime||'Aucune restriction'],
              ['Allergies', p.allergies||'Aucune'],
              ['Activité physique', p.activite||'—'],
              ['Fringales', p.fringales||'—'],
              ['Budget repas', p.budget||'—'],
            ].map(([l,v],i)=>`
            <div style="display:flex;justify-content:space-between;padding:.5rem .85rem;${i>0?'border-top:1px solid #e8edeb':''}">
              <span style="font-size:.78rem;color:#6b7b74;">${l}</span>
              <span style="font-size:.78rem;font-weight:500;color:#0d2018;text-align:right;max-width:200px;">${v}</span>
            </div>`).join('')}
          </div>
        </div>

        <!-- Notes -->
        ${p.notes ? `
        <div>
          <div style="font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:#6b7b74;margin-bottom:.4rem;">Notes cliniques</div>
          <div style="background:#fff8e6;border:1px solid #fed7aa;border-radius:8px;padding:.75rem;font-size:.82rem;color:#92400e;line-height:1.6;">${p.notes}</div>
        </div>` : ''}

        <!-- Actions -->
        <div style="display:flex;gap:.75rem;padding-top:.5rem;border-top:1px solid #e8edeb;">
          <button onclick="validerPlan('${p.id}');document.getElementById('dossierModal').remove();"
            style="flex:1;background:#1D9E75;color:#fff;border:none;border-radius:999px;padding:.65rem;font-size:.82rem;font-weight:500;cursor:pointer;">
            ✓ Valider le plan
          </button>
          <a href="mailto:${p.email}"
            style="flex:1;background:#f7f9f7;color:#0d2018;border:1px solid #e8edeb;border-radius:999px;padding:.65rem;font-size:.82rem;font-weight:500;text-decoration:none;display:flex;align-items:center;justify-content:center;">
            ✉ Contacter
          </a>
          <button onclick="document.getElementById('dossierModal').remove()"
            style="background:#f7f9f7;color:#6b7b74;border:1px solid #e8edeb;border-radius:999px;padding:.65rem 1rem;font-size:.82rem;cursor:pointer;">
            Fermer
          </button>
        </div>

      </div>
    </div>`;

  // Fermer en cliquant dehors
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}
