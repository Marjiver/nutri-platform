/**
 * chatbot-widget.js — NutriDoc
 * Chatbot IA flottant propulsé par Claude (Anthropic API)
 * S'injecte automatiquement dans toutes les pages via <script src="js/chatbot-widget.js">
 *
 * Réponses : FAQ NutriDoc + questions nutritionnelles générales
 * Rate limit : 10 messages / 5 minutes par session
 * Contexte système : rôle, tarifs, fonctionnement NutriDoc
 */

(function () {

  const SYSTEM_PROMPT = `Tu es l'assistant de NutriDoc, une plateforme de pré-bilan nutritionnel sécurisée développée par CaliDoc Santé (contact@calidocsante.fr).

Tu réponds aux questions des utilisateurs (patients, diététiciens, prescripteurs) sur :
- Le fonctionnement de NutriDoc (bilan, plan alimentaire, visio)
- Les tarifs : bilan gratuit · plan 24,90 € · visio 55 € (dont 47 € reversés au diét.)
- Les délais : plan livré sous 48h max jours ouvrés
- Les red flags : situations médicales qui bloquent le plan automatique
- La vérification RPPS pour les diét., SIRET pour les prescripteurs
- Les formules diét : Essentiel (16 €/plan), Pro (49 €/mois, 18 €/plan), Expert (39 €/mois annuel, 20 €/plan)
- Les packs prescripteurs : Découverte 49 € HT / 10 crédits, Pro 89 € HT / 20 crédits, Volume 219 € HT / 50 crédits
- La remboursabilité mutuelle de la visio (attestation générée automatiquement)
- La table CIQUAL 2020 (valeurs nutritionnelles en cuit)
- Questions nutritionnelles générales de bien-être

RÈGLES :
- Réponds toujours en français
- Sois concis, bienveillant et professionnel
- Ne donne JAMAIS de conseil médical — oriente vers un médecin
- Pour les questions hors périmètre NutriDoc, réponds brièvement et redirige
- Si la question concerne un dysfonctionnement, invite à ouvrir un ticket support
- Termine les réponses importantes par un call-to-action (ex: "Commencer mon bilan gratuit →")
- Maximum 120 mots par réponse sauf si une liste est nécessaire`;

  const SUGGESTIONS = [
    'Comment fonctionne le bilan gratuit ?',
    'Combien coûte un plan alimentaire ?',
    'En combien de temps reçois-je mon plan ?',
    'La visio est-elle remboursée par la mutuelle ?',
    'Comment s\'inscrire comme diététicien ?',
    'Qu\'est-ce qu\'un red flag ?',
    'Comment prescrire pour mes clients ?',
    'Quelle est la différence diét / prescripteur ?',
  ];

  // ── Rate limiter session ──────────────────────────────────
  const RL_KEY  = 'nutridoc_chat_rl';
  const RL_MAX  = 10;
  const RL_WIN  = 5 * 60 * 1000; // 5 minutes

  function canChat() {
    const now    = Date.now();
    const stored = JSON.parse(sessionStorage.getItem(RL_KEY) || '[]');
    const recent = stored.filter(t => now - t < RL_WIN);
    sessionStorage.setItem(RL_KEY, JSON.stringify(recent));
    if (recent.length >= RL_MAX) {
      const wait = Math.ceil((RL_WIN - (now - recent[0])) / 1000);
      return { ok: false, wait };
    }
    return { ok: true };
  }
  function consumeRL() {
    const stored = JSON.parse(sessionStorage.getItem(RL_KEY) || '[]');
    stored.push(Date.now());
    sessionStorage.setItem(RL_KEY, JSON.stringify(stored));
  }

  // ── Historique conversation ───────────────────────────────
  let messages = [];
  let isOpen   = false;
  let isTyping = false;

  // ── Injection DOM ─────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #nd-chat-fab {
      position:fixed;bottom:24px;right:24px;z-index:9999;
      width:56px;height:56px;border-radius:50%;
      background:linear-gradient(135deg,#1D9E75,#0f6e56);
      border:none;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 20px rgba(29,158,117,.4);
      transition:transform .2s,box-shadow .2s;
    }
    #nd-chat-fab:hover { transform:scale(1.08);box-shadow:0 6px 28px rgba(29,158,117,.5); }
    #nd-chat-fab svg { pointer-events:none; }
    #nd-chat-badge {
      position:absolute;top:-2px;right:-2px;
      background:#ef4444;color:#fff;
      width:18px;height:18px;border-radius:50%;
      font-size:10px;font-weight:600;
      display:flex;align-items:center;justify-content:center;
      font-family:system-ui,sans-serif;
      animation:badgePop .3s ease;
    }
    @keyframes badgePop{from{transform:scale(0)}to{transform:scale(1)}}
    #nd-chat-window {
      position:fixed;bottom:92px;right:24px;z-index:9998;
      width:360px;max-height:560px;
      background:#fff;border-radius:16px;
      box-shadow:0 8px 40px rgba(0,0,0,.15);
      display:flex;flex-direction:column;
      overflow:hidden;
      transition:opacity .25s,transform .25s;
      font-family:'Outfit',system-ui,sans-serif;
    }
    #nd-chat-window.chat-hidden {
      opacity:0;transform:translateY(16px) scale(.97);pointer-events:none;
    }
    .chat-header {
      background:linear-gradient(135deg,#0d2018,#1a3a2a);
      padding:.85rem 1rem;display:flex;align-items:center;gap:.6rem;flex-shrink:0;
    }
    .chat-header-avatar {
      width:32px;height:32px;border-radius:50%;background:rgba(29,158,117,.3);
      display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;
    }
    .chat-header-name { font-size:.875rem;font-weight:500;color:#fff; }
    .chat-header-sub  { font-size:.7rem;color:rgba(255,255,255,.55); }
    .chat-close { margin-left:auto;background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:1.1rem;padding:2px;transition:color .15s; }
    .chat-close:hover { color:#fff; }
    .chat-messages {
      flex:1;overflow-y:auto;padding:.75rem;display:flex;flex-direction:column;gap:.5rem;
      scroll-behavior:smooth;
    }
    .chat-msg { max-width:85%;display:flex;flex-direction:column;gap:2px; }
    .chat-msg.user  { align-self:flex-end; }
    .chat-msg.bot   { align-self:flex-start; }
    .chat-bubble {
      padding:.6rem .85rem;border-radius:12px;font-size:.82rem;line-height:1.55;
    }
    .chat-msg.user  .chat-bubble { background:#1D9E75;color:#fff;border-bottom-right-radius:3px; }
    .chat-msg.bot   .chat-bubble { background:#f3f4f6;color:#1f2937;border-bottom-left-radius:3px; }
    .chat-msg.error .chat-bubble { background:#fef2f2;color:#dc2626; }
    .chat-time { font-size:.65rem;color:#9ca3af;align-self:flex-end;padding:0 4px; }
    .chat-typing { align-self:flex-start;padding:.6rem .85rem;background:#f3f4f6;border-radius:12px;border-bottom-left-radius:3px; }
    .typing-dots { display:flex;gap:3px; }
    .typing-dot  { width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:typingBounce 1.2s ease infinite; }
    .typing-dot:nth-child(2) { animation-delay:.2s; }
    .typing-dot:nth-child(3) { animation-delay:.4s; }
    @keyframes typingBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
    .chat-suggestions {
      padding:.5rem .75rem;display:flex;flex-wrap:wrap;gap:.35rem;flex-shrink:0;
      border-top:1px solid #f3f4f6;
    }
    .chat-suggestion {
      background:#f0faf5;color:#0f6e56;border:1px solid #9FE1CB;
      border-radius:999px;padding:3px 10px;font-size:.72rem;cursor:pointer;
      transition:background .15s;font-family:'Outfit',system-ui,sans-serif;
      white-space:nowrap;
    }
    .chat-suggestion:hover { background:#d1fae5; }
    .chat-input-row {
      padding:.6rem .75rem;border-top:1px solid #f3f4f6;
      display:flex;gap:.5rem;align-items:center;flex-shrink:0;
    }
    .chat-input {
      flex:1;border:1px solid #e5e7eb;border-radius:999px;
      padding:.45rem .85rem;font-size:.82rem;outline:none;
      font-family:'Outfit',system-ui,sans-serif;
      transition:border-color .15s;
    }
    .chat-input:focus { border-color:#1D9E75; }
    .chat-send {
      width:34px;height:34px;border-radius:50%;background:#1D9E75;border:none;
      display:flex;align-items:center;justify-content:center;cursor:pointer;
      transition:background .15s;flex-shrink:0;
    }
    .chat-send:hover { background:#0f6e56; }
    .chat-send:disabled { background:#e5e7eb;cursor:default; }
    .chat-footer { text-align:center;font-size:.62rem;color:#d1d5db;padding:.3rem 0; }
    @media(max-width:420px){
      #nd-chat-window{right:8px;left:8px;width:auto;bottom:80px;}
    }
  `;
  document.head.appendChild(style);

  // FAB
  const fab = document.createElement('button');
  fab.id  = 'nd-chat-fab';
  fab.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="rgba(255,255,255,.9)"/>
    </svg>
    <div id="nd-chat-badge">1</div>`;
  fab.onclick = toggleChat;
  document.body.appendChild(fab);

  // Fenêtre
  const win = document.createElement('div');
  win.id        = 'nd-chat-window';
  win.className = 'chat-hidden';
  win.innerHTML = `
    <div class="chat-header">
      <div class="chat-header-avatar">🥗</div>
      <div>
        <div class="chat-header-name">Assistant NutriDoc</div>
        <div class="chat-header-sub">Répond en quelques secondes · IA Claude</div>
      </div>
      <button class="chat-close" onclick="window.__ndChat.toggle()">✕</button>
    </div>
    <div class="chat-messages" id="nd-chat-msgs"></div>
    <div class="chat-suggestions" id="nd-chat-sugg"></div>
    <div class="chat-input-row">
      <input class="chat-input" id="nd-chat-input" placeholder="Posez votre question…" maxlength="400"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.__ndChat.send();}"/>
      <button class="chat-send" id="nd-chat-send" onclick="window.__ndChat.send()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8L2 2l2 6-2 6 12-6z" fill="#fff"/></svg>
      </button>
    </div>
    <div class="chat-footer">Alimenté par Claude · NutriDoc by CaliDoc Santé</div>
  `;
  document.body.appendChild(win);

  // ── Fonctions ─────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    win.classList.toggle('chat-hidden', !isOpen);
    document.getElementById('nd-chat-badge')?.remove();
    if (isOpen && messages.length === 0) addWelcome();
    if (isOpen) setTimeout(() => document.getElementById('nd-chat-input')?.focus(), 200);
  }

  function addWelcome() {
    addMessage('bot', 'Bonjour ! Je suis l\'assistant NutriDoc. Posez-moi vos questions sur le bilan, les plans alimentaires, les tarifs ou le fonctionnement de la plateforme.');
    renderSuggestions();
  }

  function renderSuggestions() {
    const z = document.getElementById('nd-chat-sugg');
    if (!z) return;
    z.innerHTML = SUGGESTIONS.slice(0, 4).map(s =>
      `<button class="chat-suggestion" onclick="window.__ndChat.quickSend('${s.replace(/'/g,"\\'")}')">${s}</button>`
    ).join('');
  }

  function addMessage(role, text, error = false) {
    const msgs = document.getElementById('nd-chat-msgs');
    if (!msgs) return;

    const now   = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    const div   = document.createElement('div');
    div.className = `chat-msg ${role}${error ? ' error' : ''}`;
    div.innerHTML = `<div class="chat-bubble">${text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div><div class="chat-time">${now}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    messages.push({ role: role === 'user' ? 'user' : 'assistant', content: text });
  }

  function showTyping() {
    const msgs = document.getElementById('nd-chat-msgs');
    if (!msgs) return;
    const div   = document.createElement('div');
    div.id        = 'nd-typing';
    div.className = 'chat-typing';
    div.innerHTML = '<div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function hideTyping() { document.getElementById('nd-typing')?.remove(); }

  async function send(text) {
    const input = document.getElementById('nd-chat-input');
    const msg   = (text || input?.value || '').trim();
    if (!msg || isTyping) return;

    // Vider suggestions après 1er message
    document.getElementById('nd-chat-sugg').innerHTML = '';

    // Rate limit
    const rl = canChat();
    if (!rl.ok) {
      addMessage('bot', `⚠ Trop de messages. Attendez ${rl.wait} secondes.`, true); return;
    }
    consumeRL();

    if (input) input.value = '';
    document.getElementById('nd-chat-send').disabled = true;
    isTyping = true;
    addMessage('user', msg);
    showTyping();

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-10) // 5 tours max de contexte
            .map(m => ({ role: m.role, content: m.content }))
            .concat([{ role: 'user', content: msg }])
        })
      });

      if (!resp.ok) throw new Error('API ' + resp.status);
      const data = await resp.json();
      const reply = data.content?.[0]?.text || 'Désolé, je n\'ai pas pu répondre.';
      hideTyping();
      addMessage('bot', reply);

      // Afficher suggestions contextuelles après chaque réponse
      if (messages.length < 4) renderSuggestions();

    } catch (err) {
      hideTyping();
      addMessage('bot', 'Une erreur est survenue. Veuillez réessayer ou nous contacter à contact@calidocsante.fr.', true);
      console.error('[NutriDoc Chat]', err);
    } finally {
      isTyping = false;
      document.getElementById('nd-chat-send').disabled = false;
      document.getElementById('nd-chat-input')?.focus();
    }
  }

  // API publique
  window.__ndChat = { toggle: toggleChat, send: () => send(), quickSend: (t) => send(t) };

})();
