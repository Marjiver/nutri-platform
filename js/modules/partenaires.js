/**
 * partenaires.js — NutriDoc · Gestion des partenaires B2B
 * 
 * Fonctionnalités :
 * - Gestion des utilisateurs (admin, coach, etc.)
 * - Commandes de plans en lot
 * - File d'attente et suivi des commandes
 * - Tableau de bord des KPIs (crédits, commandes, CA)
 * - Gestion des factures et export CSV
 * - Simulateur de revenus
 * - Support client intégré
 * 
 * Dépendances : auth.js, error-handler.js, stripe.js
 */

// ==================== CONFIGURATION ====================

const PARTNER_CONFIG = {
  storageKey: 'nutridoc_partner_data',
  creditsKey: 'nutridoc_partner_credits',
  ordersKey: 'nutridoc_partner_orders',
  usersKey: 'nutridoc_partner_users',
  invoicesKey: 'nutridoc_partner_invoices',
  itemsPerPage: 10,
  defaultOffer: 'pro',
  offers: {
    team: { name: 'Team', price: 149, credits: 10, maxUsers: 5, features: ['CRM multi-utilisateurs', 'Jusqu\'à 10 plans/mois', 'Support email'] },
    pro: { name: 'Pro', price: 249, credits: 50, maxUsers: 10, features: ['Marque blanche', 'Jusqu\'à 50 plans/mois', 'Support prioritaire', 'Export CSV'] },
    enterprise: { name: 'Enterprise', price: 499, credits: 150, maxUsers: -1, features: ['API REST', 'Account manager', 'SLA 48h garanti', 'Marque blanche complète'] }
  }
};

// ==================== ÉTAT GLOBAL ====================

let partnerState = {
  currentUser: null,
  currentOffer: 'pro',
  credits: 0,
  users: [],
  orders: [],
  invoices: [],
  currentTab: 'dashboard',
  filters: { status: 'all', search: '' },
  currentPage: 1
};

// ==================== INITIALISATION ====================

/**
 * Initialise l'espace partenaire
 */
async function initPartner() {
  console.log('[Partner] Initialisation...');
  
  // Charger les données depuis localStorage / Supabase
  await loadPartnerData();
  
  // Initialiser l'interface
  initPartnerUI();
  
  // Initialiser les événements
  initPartnerEvents();
  
  // Vérifier l'authentification
  await checkPartnerAuth();
  
  console.log('[Partner] Initialisé avec succès');
}

/**
 * Vérifie que l'utilisateur est authentifié en tant que partenaire
 */
async function checkPartnerAuth() {
  try {
    if (typeof getCurrentUser === 'function') {
      const user = await getCurrentUser();
      if (!user || (user.role !== 'partner' && user.role !== 'prescriber')) {
        // Rediriger vers la page d'accueil partenaire
        if (!window.location.pathname.includes('partenariats.html')) {
          window.location.href = 'partenariats.html';
        }
      } else {
        partnerState.currentUser = user;
        updatePartnerUserInfo(user);
      }
    }
  } catch (e) {
    console.warn('[Partner] Erreur vérification auth:', e);
  }
}

/**
 * Met à jour les informations utilisateur dans l'interface
 */
function updatePartnerUserInfo(user) {
  const userNameEl = document.getElementById('partnerUserName');
  const userBadgeEl = document.getElementById('partnerUserBadge');
  if (userNameEl) userNameEl.textContent = user.prenom || user.nom || 'Partenaire';
  if (userBadgeEl) userBadgeEl.textContent = partnerState.currentOffer === 'pro' ? '⭐ Pro' : 'Pack Team';
}

/**
 * Charge les données du partenaire
 */
async function loadPartnerData() {
  try {
    // Charger depuis localStorage
    const savedCredits = localStorage.getItem(PARTNER_CONFIG.creditsKey);
    const savedUsers = localStorage.getItem(PARTNER_CONFIG.usersKey);
    const savedOrders = localStorage.getItem(PARTNER_CONFIG.ordersKey);
    const savedInvoices = localStorage.getItem(PARTNER_CONFIG.invoicesKey);
    
    partnerState.credits = savedCredits ? parseInt(savedCredits) : 25;
    partnerState.users = savedUsers ? JSON.parse(savedUsers) : getDefaultUsers();
    partnerState.orders = savedOrders ? JSON.parse(savedOrders) : getDefaultOrders();
    partnerState.invoices = savedInvoices ? JSON.parse(savedInvoices) : getDefaultInvoices();
    
    // Mettre à jour l'affichage
    updatePartnerKPIs();
    updateCreditsDisplay();
  } catch (e) {
    console.error('[Partner] Erreur chargement données:', e);
    // Données par défaut
    partnerState.credits = 25;
    partnerState.users = getDefaultUsers();
    partnerState.orders = getDefaultOrders();
    partnerState.invoices = getDefaultInvoices();
  }
}

/**
 * Données utilisateurs par défaut
 */
function getDefaultUsers() {
  return [
    { id: 'u1', name: 'Antoine D.', role: 'admin', email: 'antoine@partner.fr', orders: 15, avatar: 'A', active: true },
    { id: 'u2', name: 'Sophie M.', role: 'coach', email: 'sophie@partner.fr', orders: 7, avatar: 'S', active: true },
    { id: 'u3', name: 'Romain L.', role: 'coach', email: 'romain@partner.fr', orders: 5, avatar: 'R', active: true }
  ];
}

/**
 * Commandes par défaut
 */
function getDefaultOrders() {
  return [
    { id: 'cmd_001', patient: 'Marie D.', objectif: 'Perte de poids', user: 'Antoine D.', status: 'completed', date: '2026-04-01', credits: 1 },
    { id: 'cmd_002', patient: 'Thomas K.', objectif: 'Prise de masse', user: 'Sophie M.', status: 'completed', date: '2026-04-02', credits: 1 },
    { id: 'cmd_003', patient: 'Sophie M.', objectif: 'Équilibre', user: 'Romain L.', status: 'pending', date: '2026-04-03', credits: 1 },
    { id: 'cmd_004', patient: 'Lucas B.', objectif: 'Performance', user: 'Antoine D.', status: 'progress', date: '2026-04-04', credits: 1 },
    { id: 'cmd_005', patient: 'Emma R.', objectif: 'Perte de poids', user: 'Sophie M.', status: 'completed', date: '2026-04-05', credits: 1 },
    { id: 'cmd_006', patient: 'Paul L.', objectif: 'Prévention', user: 'Antoine D.', status: 'pending', date: '2026-04-06', credits: 1 }
  ];
}

/**
 * Factures par défaut
 */
function getDefaultInvoices() {
  return [
    { id: 'INV-001', date: '2026-03-01', amount: 249, status: 'paid', period: 'Mars 2026', downloadUrl: '#' },
    { id: 'INV-002', date: '2026-02-01', amount: 249, status: 'paid', period: 'Février 2026', downloadUrl: '#' },
    { id: 'INV-003', date: '2026-01-01', amount: 249, status: 'paid', period: 'Janvier 2026', downloadUrl: '#' }
  ];
}

/**
 * Sauvegarde les données
 */
function savePartnerData() {
  localStorage.setItem(PARTNER_CONFIG.creditsKey, partnerState.credits);
  localStorage.setItem(PARTNER_CONFIG.usersKey, JSON.stringify(partnerState.users));
  localStorage.setItem(PARTNER_CONFIG.ordersKey, JSON.stringify(partnerState.orders));
  localStorage.setItem(PARTNER_CONFIG.invoicesKey, JSON.stringify(partnerState.invoices));
}

// ==================== INTERFACE UTILISATEUR ====================

/**
 * Initialise l'interface UI
 */
function initPartnerUI() {
  // Initialiser les onglets
  initPartnerTabs();
  
  // Initialiser les graphiques (si Chart.js disponible)
  if (typeof Chart !== 'undefined') {
    initPartnerCharts();
  }
  
  // Mettre à jour les KPIs
  updatePartnerKPIs();
  
  // Remplir les tableaux
  renderUsersTable();
  renderOrdersTable();
  renderInvoicesTable();
  
  // Initialiser le simulateur
  initPartnerSimulator();
}

/**
 * Initialise les onglets
 */
function initPartnerTabs() {
  const tabs = document.querySelectorAll('.partner-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      if (tabId) {
        switchPartnerTab(tabId);
      }
    });
  });
}

/**
 * Change d'onglet
 * @param {string} tabId - Identifiant de l'onglet
 */
function switchPartnerTab(tabId) {
  partnerState.currentTab = tabId;
  
  // Mettre à jour les classes actives
  document.querySelectorAll('.partner-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  
  document.querySelectorAll('.partner-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });
  
  // Recharger les données si nécessaire
  if (tabId === 'orders') {
    renderOrdersTable();
  } else if (tabId === 'users') {
    renderUsersTable();
  } else if (tabId === 'invoices') {
    renderInvoicesTable();
  } else if (tabId === 'dashboard') {
    updatePartnerKPIs();
    if (typeof Chart !== 'undefined') {
      updatePartnerCharts();
    }
  }
}

/**
 * Met à jour les KPIs du tableau de bord
 */
function updatePartnerKPIs() {
  const totalOrders = partnerState.orders.length;
  const pendingOrders = partnerState.orders.filter(o => o.status === 'pending').length;
  const completedOrders = partnerState.orders.filter(o => o.status === 'completed').length;
  const totalSpent = partnerState.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  
  document.querySelectorAll('.partner-kpi-value').forEach(el => {
    const kpi = el.dataset.kpi;
    if (kpi === 'credits') el.textContent = partnerState.credits;
    if (kpi === 'orders') el.textContent = totalOrders;
    if (kpi === 'pending') el.textContent = pendingOrders;
    if (kpi === 'completed') el.textContent = completedOrders;
    if (kpi === 'spent') el.textContent = totalSpent.toLocaleString('fr-FR') + ' €';
  });
}

/**
 * Met à jour l'affichage des crédits
 */
function updateCreditsDisplay() {
  const creditsEl = document.getElementById('partnerCredits');
  if (creditsEl) creditsEl.textContent = partnerState.credits;
  
  const progressEl = document.getElementById('creditsProgress');
  if (progressEl) {
    const maxCredits = PARTNER_CONFIG.offers[partnerState.currentOffer].credits;
    const percent = (partnerState.credits / maxCredits) * 100;
    progressEl.style.width = Math.min(100, percent) + '%';
  }
}

/**
 * Initialise les graphiques (commandes mensuelles)
 */
let ordersChart = null;

function initPartnerCharts() {
  const canvas = document.getElementById('partnerOrdersChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ordersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
      datasets: [{
        label: 'Commandes',
        data: [8, 12, 18, 24, 31, 28],
        backgroundColor: '#1D9E75',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 5 } },
        x: { grid: { display: false } }
      }
    }
  });
}

function updatePartnerCharts() {
  if (ordersChart) ordersChart.update();
}

// ==================== GESTION DES UTILISATEURS ====================

/**
 * Affiche le tableau des utilisateurs
 */
function renderUsersTable() {
  const container = document.getElementById('partnerUsersTable');
  if (!container) return;
  
  const roleLabels = { admin: 'Admin', coach: 'Coach', viewer: 'Lecteur' };
  const activeUsers = partnerState.users.filter(u => u.active);
  
  container.innerHTML = activeUsers.map(user => `
    <div class="partner-user-row">
      <div class="partner-user-avatar">${user.avatar}</div>
      <div class="partner-user-info">
        <div class="partner-user-name">${user.name}</div>
        <div class="partner-user-email">${user.email}</div>
      </div>
      <div class="partner-user-role">
        <span class="partner-badge ${user.role === 'admin' ? 'partner-badge-primary' : 'partner-badge-secondary'}">${roleLabels[user.role]}</span>
      </div>
      <div class="partner-user-stats">${user.orders} commandes</div>
      <div class="partner-user-actions">
        <button class="partner-icon-btn" onclick="editPartnerUser('${user.id}')" title="Modifier">✏️</button>
        ${user.role !== 'admin' ? `<button class="partner-icon-btn danger" onclick="removePartnerUser('${user.id}')" title="Supprimer">🗑️</button>` : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Ajoute un utilisateur
 */
function addPartnerUser() {
  const name = prompt('Nom de l\'utilisateur :');
  if (!name) return;
  
  const email = prompt('Email :');
  if (!email) return;
  
  const role = prompt('Rôle (admin/coach/viewer) :', 'coach');
  
  const newUser = {
    id: 'u' + Date.now(),
    name: name,
    email: email,
    role: role === 'admin' ? 'admin' : (role === 'viewer' ? 'viewer' : 'coach'),
    orders: 0,
    avatar: name.charAt(0).toUpperCase(),
    active: true
  };
  
  partnerState.users.push(newUser);
  savePartnerData();
  renderUsersTable();
  showPartnerToast(`Utilisateur ${name} ajouté`, 'success');
}

/**
 * Modifie un utilisateur
 */
function editPartnerUser(userId) {
  const user = partnerState.users.find(u => u.id === userId);
  if (!user) return;
  
  const newName = prompt('Nouveau nom :', user.name);
  if (newName) user.name = newName;
  
  const newEmail = prompt('Nouvel email :', user.email);
  if (newEmail) user.email = newEmail;
  
  const newRole = prompt('Rôle (admin/coach/viewer) :', user.role);
  if (newRole && ['admin', 'coach', 'viewer'].includes(newRole)) user.role = newRole;
  
  savePartnerData();
  renderUsersTable();
  showPartnerToast(`Utilisateur ${user.name} modifié`, 'success');
}

/**
 * Supprime un utilisateur
 */
function removePartnerUser(userId) {
  if (confirm('Supprimer cet utilisateur ?')) {
    const user = partnerState.users.find(u => u.id === userId);
    if (user && user.role !== 'admin') {
      partnerState.users = partnerState.users.filter(u => u.id !== userId);
      savePartnerData();
      renderUsersTable();
      showPartnerToast(`Utilisateur ${user.name} supprimé`, 'warning');
    } else if (user.role === 'admin') {
      showPartnerToast('Impossible de supprimer l\'administrateur principal', 'error');
    }
  }
}

// ==================== GESTION DES COMMANDES ====================

/**
 * Affiche le tableau des commandes
 */
function renderOrdersTable() {
  const container = document.getElementById('partnerOrdersTable');
  if (!container) return;
  
  const statusLabels = { pending: 'En attente', progress: 'En cours', completed: 'Livré' };
  const statusClasses = { pending: 'partner-badge-warning', progress: 'partner-badge-info', completed: 'partner-badge-success' };
  
  let filteredOrders = [...partnerState.orders];
  
  // Filtre par statut
  if (partnerState.filters.status !== 'all') {
    filteredOrders = filteredOrders.filter(o => o.status === partnerState.filters.status);
  }
  
  // Filtre par recherche
  if (partnerState.filters.search) {
    const search = partnerState.filters.search.toLowerCase();
    filteredOrders = filteredOrders.filter(o => 
      o.patient.toLowerCase().includes(search) || 
      o.user.toLowerCase().includes(search)
    );
  }
  
  // Pagination
  const start = (partnerState.currentPage - 1) * PARTNER_CONFIG.itemsPerPage;
  const paginatedOrders = filteredOrders.slice(start, start + PARTNER_CONFIG.itemsPerPage);
  const totalPages = Math.ceil(filteredOrders.length / PARTNER_CONFIG.itemsPerPage);
  
  container.innerHTML = paginatedOrders.map(order => `
    <div class="partner-order-row">
      <div class="partner-order-info">
        <div class="partner-order-patient">${order.patient}</div>
        <div class="partner-order-date">${new Date(order.date).toLocaleDateString('fr-FR')}</div>
      </div>
      <div class="partner-order-objectif">${order.objectif}</div>
      <div class="partner-order-user">${order.user}</div>
      <div class="partner-order-status">
        <span class="${statusClasses[order.status]}">${statusLabels[order.status]}</span>
      </div>
      <div class="partner-order-actions">
        <button class="partner-icon-btn" onclick="viewPartnerOrder('${order.id}')" title="Détails">👁️</button>
        ${order.status === 'pending' ? `<button class="partner-icon-btn" onclick="cancelPartnerOrder('${order.id}')" title="Annuler">✕</button>` : ''}
      </div>
    </div>
  `).join('');
  
  // Mettre à jour la pagination
  renderPartnerPagination(totalPages);
}

/**
 * Applique les filtres
 */
function filterPartnerOrders() {
  const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
  const searchInput = document.getElementById('orderSearch')?.value || '';
  
  partnerState.filters.status = statusFilter;
  partnerState.filters.search = searchInput;
  partnerState.currentPage = 1;
  
  renderOrdersTable();
}

/**
 * Réinitialise les filtres
 */
function resetPartnerFilters() {
  partnerState.filters = { status: 'all', search: '' };
  partnerState.currentPage = 1;
  
  const statusSelect = document.getElementById('orderStatusFilter');
  const searchInput = document.getElementById('orderSearch');
  if (statusSelect) statusSelect.value = 'all';
  if (searchInput) searchInput.value = '';
  
  renderOrdersTable();
}

/**
 * Affiche la pagination
 */
function renderPartnerPagination(totalPages) {
  const container = document.getElementById('partnerPagination');
  if (!container) return;
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="partner-page-btn ${i === partnerState.currentPage ? 'active' : ''}" onclick="goToPartnerPage(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}

/**
 * Change de page
 */
function goToPartnerPage(page) {
  partnerState.currentPage = page;
  renderOrdersTable();
}

/**
 * Crée une nouvelle commande
 */
async function createPartnerOrder() {
  const patientName = document.getElementById('orderPatientName')?.value.trim();
  const objectif = document.getElementById('orderObjectif')?.value;
  const userId = document.getElementById('orderUser')?.value;
  
  if (!patientName) {
    showPartnerToast('Veuillez saisir le nom du patient', 'error');
    return;
  }
  
  if (!objectif) {
    showPartnerToast('Veuillez sélectionner un objectif', 'error');
    return;
  }
  
  if (partnerState.credits <= 0) {
    showPartnerToast('Crédits insuffisants. Veuillez recharger.', 'error');
    return;
  }
  
  // Créer la commande
  const newOrder = {
    id: 'cmd_' + Date.now(),
    patient: patientName,
    objectif: objectif,
    user: userId ? partnerState.users.find(u => u.id === userId)?.name || 'Admin' : 'Admin',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    credits: 1
  };
  
  partnerState.orders.unshift(newOrder);
  partnerState.credits -= 1;
  
  savePartnerData();
  updateCreditsDisplay();
  updatePartnerKPIs();
  renderOrdersTable();
  
  // Réinitialiser le formulaire
  document.getElementById('orderPatientName').value = '';
  document.getElementById('orderObjectif').value = '';
  
  showPartnerToast(`Commande créée pour ${patientName}`, 'success');
  
  // Simuler la livraison après 5 secondes (démo)
  setTimeout(() => {
    newOrder.status = 'completed';
    savePartnerData();
    renderOrdersTable();
    updatePartnerKPIs();
    showPartnerToast(`Plan livré pour ${patientName}`, 'success');
  }, 5000);
}

/**
 * Affiche les détails d'une commande
 */
function viewPartnerOrder(orderId) {
  const order = partnerState.orders.find(o => o.id === orderId);
  if (order) {
    alert(`Commande ${order.id}\nPatient: ${order.patient}\nObjectif: ${order.objectif}\nStatut: ${order.status}\nDate: ${order.date}`);
  }
}

/**
 * Annule une commande
 */
function cancelPartnerOrder(orderId) {
  if (confirm('Annuler cette commande ? Les crédits seront remboursés.')) {
    const orderIndex = partnerState.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      const order = partnerState.orders[orderIndex];
      if (order.status === 'pending') {
        partnerState.orders.splice(orderIndex, 1);
        partnerState.credits += 1;
        savePartnerData();
        updateCreditsDisplay();
        updatePartnerKPIs();
        renderOrdersTable();
        showPartnerToast(`Commande annulée, 1 crédit remboursé`, 'warning');
      } else {
        showPartnerToast('Impossible d\'annuler une commande déjà en cours ou livrée', 'error');
      }
    }
  }
}

// ==================== FACTURES ====================

/**
 * Affiche le tableau des factures
 */
function renderInvoicesTable() {
  const container = document.getElementById('partnerInvoicesTable');
  if (!container) return;
  
  container.innerHTML = partnerState.invoices.map(inv => `
    <div class="partner-invoice-row">
      <div class="partner-invoice-id">${inv.id}</div>
      <div class="partner-invoice-period">${inv.period}</div>
      <div class="partner-invoice-date">${new Date(inv.date).toLocaleDateString('fr-FR')}</div>
      <div class="partner-invoice-amount">${inv.amount.toFixed(2)} €</div>
      <div class="partner-invoice-status">
        <span class="partner-badge partner-badge-success">Payée</span>
      </div>
      <div class="partner-invoice-actions">
        <button class="partner-icon-btn" onclick="downloadPartnerInvoice('${inv.id}')" title="Télécharger">📄</button>
      </div>
    </div>
  `).join('');
}

/**
 * Télécharge une facture
 */
function downloadPartnerInvoice(invoiceId) {
  const invoice = partnerState.invoices.find(i => i.id === invoiceId);
  if (invoice) {
    showPartnerToast(`Téléchargement de la facture ${invoice.id}...`, 'success');
    // Simulation de téléchargement
    setTimeout(() => {
      alert(`Facture ${invoice.id} téléchargée (simulation)`);
    }, 500);
  }
}

// ==================== RECRUTEMENT (AJOUT UTILISATEUR) ====================

// L'ajout d'utilisateur est déjà géré plus haut

// ==================== SIMULATEUR ====================

/**
 * Initialise le simulateur de revenus
 */
function initPartnerSimulator() {
  const slider = document.getElementById('simulatorClients');
  if (slider) {
    slider.addEventListener('input', updatePartnerSimulator);
  }
  updatePartnerSimulator();
}

/**
 * Met à jour le simulateur
 */
function updatePartnerSimulator() {
  const clients = parseInt(document.getElementById('simulatorClients')?.value || 25);
  const conversion = parseInt(document.getElementById('simulatorConversion')?.value || 30);
  const price = parseInt(document.getElementById('simulatorPrice')?.value || 35);
  const costPerPlan = partnerState.currentOffer === 'pro' ? 10 : (partnerState.currentOffer === 'enterprise' ? 8 : 13);
  
  const interested = Math.round(clients * conversion / 100);
  const revenue = interested * price;
  const cost = interested * costPerPlan;
  const margin = revenue - cost;
  const monthlyMargin = margin;
  const yearlyMargin = monthlyMargin * 12;
  
  document.getElementById('simInterested').textContent = interested;
  document.getElementById('simRevenue').textContent = revenue.toLocaleString('fr-FR') + ' €';
  document.getElementById('simCost').textContent = cost.toLocaleString('fr-FR') + ' €';
  document.getElementById('simMargin').textContent = margin.toLocaleString('fr-FR') + ' €';
  document.getElementById('simYearly').textContent = yearlyMargin.toLocaleString('fr-FR') + ' €';
}

// ==================== RECHARGE DE CRÉDITS ====================

/**
 * Ouvre la modale de recharge
 */
function openPartnerRechargeModal() {
  const modal = document.getElementById('partnerRechargeModal');
  if (modal) modal.classList.add('open');
}

/**
 * Ferme la modale de recharge
 */
function closePartnerRechargeModal() {
  const modal = document.getElementById('partnerRechargeModal');
  if (modal) modal.classList.remove('open');
}

/**
 * Recharge des crédits
 */
async function rechargePartnerCredits(packKey) {
  const packs = {
    solo: { credits: 1, price: 24.90, stripeKey: 'pack_solo' },
    standard: { credits: 10, price: 130, stripeKey: 'pack_dix' },
    expert: { credits: 50, price: 500, stripeKey: 'pack_cinquante' }
  };
  
  const pack = packs[packKey];
  if (!pack) return;
  
  if (typeof StripeCheckout !== 'undefined' && StripeCheckout.acheterPack) {
    await StripeCheckout.acheterPack(pack.stripeKey);
  } else {
    // Mode démo
    if (confirm(`Ajouter ${pack.credits} crédits pour ${pack.price}€ HT ?`)) {
      partnerState.credits += pack.credits;
      savePartnerData();
      updateCreditsDisplay();
      updatePartnerKPIs();
      showPartnerToast(`${pack.credits} crédits ajoutés`, 'success');
      closePartnerRechargeModal();
    }
  }
}

// ==================== EXPORT CSV ====================

/**
 * Exporte les commandes en CSV
 */
function exportPartnerOrdersCSV() {
  let csv = 'ID,Patient,Objectif,Utilisateur,Statut,Date\n';
  partnerState.orders.forEach(o => {
    csv += `${o.id},${o.patient},${o.objectif},${o.user},${o.status},${o.date}\n`;
  });
  downloadPartnerCSV(csv, 'commandes.csv');
}

/**
 * Exporte les factures en CSV
 */
function exportPartnerInvoicesCSV() {
  let csv = 'ID,Période,Date,Montant,Statut\n';
  partnerState.invoices.forEach(i => {
    csv += `${i.id},${i.period},${i.date},${i.amount},Payée\n`;
  });
  downloadPartnerCSV(csv, 'factures.csv');
}

/**
 * Télécharge un fichier CSV
 */
function downloadPartnerCSV(content, filename) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showPartnerToast('Export CSV effectué', 'success');
}

// ==================== NOTIFICATIONS ====================

/**
 * Affiche un toast de notification
 */
function showPartnerToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `partner-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ==================== EXPORTS GLOBAUX ====================

window.initPartner = initPartner;
window.switchPartnerTab = switchPartnerTab;
window.filterPartnerOrders = filterPartnerOrders;
window.resetPartnerFilters = resetPartnerFilters;
window.goToPartnerPage = goToPartnerPage;
window.createPartnerOrder = createPartnerOrder;
window.viewPartnerOrder = viewPartnerOrder;
window.cancelPartnerOrder = cancelPartnerOrder;
window.addPartnerUser = addPartnerUser;
window.editPartnerUser = editPartnerUser;
window.removePartnerUser = removePartnerUser;
window.downloadPartnerInvoice = downloadPartnerInvoice;
window.openPartnerRechargeModal = openPartnerRechargeModal;
window.closePartnerRechargeModal = closePartnerRechargeModal;
window.rechargePartnerCredits = rechargePartnerCredits;
window.exportPartnerOrdersCSV = exportPartnerOrdersCSV;
window.exportPartnerInvoicesCSV = exportPartnerInvoicesCSV;
window.updatePartnerSimulator = updatePartnerSimulator;

// Auto-initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPartner);
} else {
  initPartner();
}

console.log('[partenaires.js] ✅ Chargé avec succès');