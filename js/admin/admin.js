/**
 * admin.js — NutriDoc · Gestion de l'interface d'administration
 * 
 * Fonctionnalités :
 * - Navigation sidebar avec chargement dynamique des sections
 * - Graphiques (Chart.js) pour les KPIs
 * - Tableaux dynamiques avec recherche et filtres
 * - Modales de confirmation
 * - Toasts de notification
 * - Gestion des thèmes (clair/sombre)
 * - Export CSV des données
 * 
 * Dépendances : Chart.js, auth.js, error-handler.js, dark-mode.js
 */

// ==================== CONFIGURATION ====================

const ADMIN_CONFIG = {
  storageKey: 'nutridoc_admin_prefs',
  sidebarStateKey: 'admin_sidebar_collapsed',
  itemsPerPage: 20,
  defaultTheme: 'light',
  charts: {
    colors: {
      primary: '#1D9E75',
      secondary: '#3b82f6',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#8b5cf6'
    }
  }
};

// ==================== ÉTAT GLOBAL ====================

let adminState = {
  currentSection: 'dashboard',
  currentPage: 1,
  filters: {},
  charts: {},
  data: {
    users: [],
    plans: [],
    payments: [],
    dietitians: [],
    prescribers: []
  }
};

// ==================== INITIALISATION ====================

/**
 * Initialise l'interface d'administration
 */
function initAdmin() {
  console.log('[Admin] Initialisation...');
  
  // Charger les préférences utilisateur
  loadAdminPreferences();
  
  // Initialiser la sidebar
  initAdminSidebar();
  
  // Initialiser les graphiques
  initAdminCharts();
  
  // Charger les données
  loadAdminData();
  
  // Initialiser les événements
  initAdminEvents();
  
  // Vérifier l'authentification admin
  checkAdminAuth();
  
  console.log('[Admin] Initialisé avec succès');
}

/**
 * Vérifie que l'utilisateur est authentifié en tant qu'admin
 */
async function checkAdminAuth() {
  try {
    if (typeof getCurrentUser === 'function') {
      const user = await getCurrentUser();
      if (!user || (user.role !== 'admin' && user.email !== 'admin@calidoc-sante.fr')) {
        // Rediriger vers login admin
        if (!window.location.pathname.includes('admin-login.html')) {
          window.location.href = 'admin-login.html';
        }
      }
    }
  } catch (e) {
    console.warn('[Admin] Erreur vérification auth:', e);
  }
}

/**
 * Charge les préférences utilisateur
 */
function loadAdminPreferences() {
  try {
    const prefs = localStorage.getItem(ADMIN_CONFIG.storageKey);
    if (prefs) {
      const parsed = JSON.parse(prefs);
      if (parsed.sidebarCollapsed) {
        document.querySelector('.admin-sidebar')?.classList.add('collapsed');
      }
    }
  } catch (e) {
    console.warn('[Admin] Erreur chargement préférences:', e);
  }
}

/**
 * Sauvegarde les préférences utilisateur
 */
function saveAdminPreferences() {
  const sidebar = document.querySelector('.admin-sidebar');
  const prefs = {
    sidebarCollapsed: sidebar?.classList.contains('collapsed') || false,
    lastSection: adminState.currentSection
  };
  localStorage.setItem(ADMIN_CONFIG.storageKey, JSON.stringify(prefs));
}

// ==================== SIDEBAR ====================

/**
 * Initialise la sidebar admin
 */
function initAdminSidebar() {
  // Navigation par sections
  document.querySelectorAll('.admin-sidebar-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (section) {
        switchAdminSection(section);
      }
    });
  });
  
  // Toggle sidebar collapse (optionnel)
  const toggleBtn = document.getElementById('adminSidebarToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.querySelector('.admin-sidebar')?.classList.toggle('collapsed');
      saveAdminPreferences();
    });
  }
  
  // Mettre en évidence la section active
  highlightActiveSection();
}

/**
 * Change la section active
 * @param {string} section - Nom de la section
 */
function switchAdminSection(section) {
  adminState.currentSection = section;
  
  // Mettre à jour l'URL sans rechargement
  const url = new URL(window.location.href);
  url.searchParams.set('section', section);
  window.history.pushState({}, '', url);
  
  // Mettre à jour l'affichage
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `section-${section}`);
  });
  
  document.querySelectorAll('.admin-sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });
  
  // Mettre à jour le titre
  updateAdminTitle(section);
  
  // Recharger les données si nécessaire
  if (section === 'dashboard') {
    refreshDashboard();
  } else if (section === 'users') {
    loadUsersTable();
  } else if (section === 'plans') {
    loadPlansTable();
  } else if (section === 'finance') {
    loadFinanceData();
  }
  
  saveAdminPreferences();
}

/**
 * Met à jour le titre de la page
 * @param {string} section - Section active
 */
function updateAdminTitle(section) {
  const titles = {
    dashboard: 'Tableau de bord',
    users: 'Utilisateurs',
    plans: 'Plans alimentaires',
    finance: 'Finances & Revenus',
    settings: 'Paramètres',
    webhooks: 'Webhooks',
    seo: 'SEO',
    backup: 'Sauvegarde'
  };
  const titleEl = document.querySelector('.admin-topbar-title');
  if (titleEl) {
    titleEl.textContent = titles[section] || 'Administration';
  }
}

/**
 * Met en évidence la section active dans la sidebar
 */
function highlightActiveSection() {
  const urlParams = new URLSearchParams(window.location.search);
  const section = urlParams.get('section') || 'dashboard';
  switchAdminSection(section);
}

// ==================== GRAPHIQUES ====================

/**
 * Initialise tous les graphiques
 */
function initAdminCharts() {
  initRevenueChart();
  initUsersChart();
  initPlansChart();
  initSourcesChart();
}

/**
 * Graphique des revenus
 */
function initRevenueChart() {
  const canvas = document.getElementById('chartRevenue');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  adminState.charts.revenue = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
      datasets: [{
        label: 'CA (€)',
        data: [12500, 14200, 15800, 17200, 18900, 21200, 23500, 25100, 27800, 30100, 33400, 36200],
        borderColor: ADMIN_CONFIG.charts.colors.primary,
        backgroundColor: 'rgba(29, 158, 117, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: ADMIN_CONFIG.charts.colors.primary
      }]
    },
    options: getChartOptions('€')
  });
}

/**
 * Graphique des utilisateurs
 */
function initUsersChart() {
  const canvas = document.getElementById('chartUsers');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  adminState.charts.users = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
      datasets: [
        {
          label: 'Patients',
          data: [45, 52, 58, 63, 71, 82, 94, 108, 125, 142, 161, 185],
          backgroundColor: ADMIN_CONFIG.charts.colors.primary,
          borderRadius: 8
        },
        {
          label: 'Diététiciens',
          data: [3, 4, 5, 5, 6, 7, 8, 8, 9, 10, 11, 12],
          backgroundColor: ADMIN_CONFIG.charts.colors.info,
          borderRadius: 8
        },
        {
          label: 'Prescripteurs',
          data: [5, 6, 8, 9, 11, 13, 14, 16, 18, 20, 23, 27],
          backgroundColor: ADMIN_CONFIG.charts.colors.warning,
          borderRadius: 8
        }
      ]
    },
    options: getChartOptions()
  });
}

/**
 * Graphique des plans
 */
function initPlansChart() {
  const canvas = document.getElementById('chartPlans');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  adminState.charts.plans = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
      datasets: [{
        label: 'Plans validés',
        data: [45, 52, 68, 75, 89, 104, 118, 135, 152, 168, 189, 212],
        borderColor: ADMIN_CONFIG.charts.colors.warning,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: getChartOptions()
  });
}

/**
 * Graphique des sources de revenus (donut)
 */
function initSourcesChart() {
  const canvas = document.getElementById('chartSources');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  adminState.charts.sources = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Plans patients', 'Abonnements diét.', 'Visios', 'Crédits prescripteurs'],
      datasets: [{
        data: [45200, 12400, 8800, 15600],
        backgroundColor: [
          ADMIN_CONFIG.charts.colors.primary,
          ADMIN_CONFIG.charts.colors.info,
          ADMIN_CONFIG.charts.colors.warning,
          ADMIN_CONFIG.charts.colors.danger
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 } }
        }
      }
    }
  });
}

/**
 * Retourne les options communes pour les graphiques
 * @param {string} ySuffix - Suffixe pour l'axe Y
 * @returns {Object}
 */
function getChartOptions(ySuffix = '') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { font: { size: 11 } }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            let value = context.raw;
            return `${label}: ${value}${ySuffix}`;
          }
        }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          callback: (value) => value + ySuffix
        }
      },
      x: {
        grid: { display: false }
      }
    }
  };
}

/**
 * Rafraîchit le dashboard
 */
function refreshDashboard() {
  // Mettre à jour les KPIs
  updateDashboardKPIs();
  
  // Rafraîchir les graphiques
  Object.values(adminState.charts).forEach(chart => {
    if (chart && typeof chart.update === 'function') {
      chart.update();
    }
  });
}

/**
 * Met à jour les indicateurs KPIs
 */
function updateDashboardKPIs() {
  // Simuler des données (à remplacer par appel API)
  const kpis = {
    revenue: 36200,
    revenueChange: 8.4,
    users: 224,
    usersChange: 12.3,
    plans: 212,
    plansChange: 12.2,
    dietitians: 12,
    dietitiansChange: 9.1,
    prescribers: 27,
    prescribersChange: 17.4,
    satisfaction: 4.8
  };
  
  document.querySelectorAll('.admin-kpi-value').forEach(el => {
    const key = el.dataset.kpi;
    if (key && kpis[key] !== undefined) {
      if (key === 'revenue') {
        el.textContent = kpis[key].toLocaleString('fr-FR') + ' €';
      } else if (key === 'satisfaction') {
        el.textContent = kpis[key] + ' ★';
      } else {
        el.textContent = kpis[key].toLocaleString('fr-FR');
      }
    }
  });
  
  document.querySelectorAll('.admin-kpi-trend').forEach(el => {
    const key = el.dataset.trend;
    if (key && kpis[key + 'Change'] !== undefined) {
      const change = kpis[key + 'Change'];
      const isUp = change > 0;
      el.classList.add(isUp ? 'up' : 'down');
      el.innerHTML = `${isUp ? '▲' : '▼'} ${Math.abs(change)}% vs mois dernier`;
    }
  });
}

// ==================== CHARGEMENT DES DONNÉES ====================

/**
 * Charge toutes les données admin
 */
async function loadAdminData() {
  try {
    // Simuler le chargement (à remplacer par appels API réels)
    await loadUsersData();
    await loadPlansData();
    await loadFinanceData();
    
    // Remplir les tableaux si la section est active
    if (adminState.currentSection === 'users') {
      renderUsersTable();
    } else if (adminState.currentSection === 'plans') {
      renderPlansTable();
    } else if (adminState.currentSection === 'finance') {
      renderFinanceTable();
    }
  } catch (error) {
    console.error('[Admin] Erreur chargement données:', error);
    if (typeof showToast === 'function') {
      showToast('Erreur lors du chargement des données', 'error');
    }
  }
}

/**
 * Charge les données utilisateurs
 */
async function loadUsersData() {
  // Données simulées
  adminState.data.users = [
    { id: 1, name: 'Marie Dupont', email: 'marie@email.fr', role: 'patient', status: 'active', created: '2026-01-15', plans: 2 },
    { id: 2, name: 'Thomas Klein', email: 'thomas@email.fr', role: 'patient', status: 'active', created: '2026-01-20', plans: 1 },
    { id: 3, name: 'Grégoire Martin', email: 'gmartin@diet.fr', role: 'dietitian', status: 'active', created: '2026-01-10', plans: 45 },
    { id: 4, name: 'Antoine Durand', email: 'antoine@presc.fr', role: 'prescriber', status: 'active', created: '2026-01-25', plans: 28 },
    { id: 5, name: 'Sophie Martin', email: 'sophie@email.fr', role: 'patient', status: 'inactive', created: '2026-02-01', plans: 0 },
    { id: 6, name: 'Dr. A. Lemaire', email: 'lemaire@diet.fr', role: 'dietitian', status: 'active', created: '2026-01-05', plans: 38 },
    { id: 7, name: 'C. Fontaine', email: 'fontaine@diet.fr', role: 'dietitian', status: 'active', created: '2026-01-12', plans: 31 },
    { id: 8, name: 'Julie Moreau', email: 'julie@presc.fr', role: 'prescriber', status: 'active', created: '2026-01-18', plans: 15 }
  ];
}

/**
 * Charge les données des plans
 */
async function loadPlansData() {
  adminState.data.plans = [
    { id: 'PLN-001', patient: 'Marie D.', dietitian: 'Grégoire Martin', objectif: 'Perte de poids', status: 'completed', date: '2026-04-01', amount: 24.90 },
    { id: 'PLN-002', patient: 'Thomas K.', dietitian: 'Grégoire Martin', objectif: 'Prise de masse', status: 'completed', date: '2026-04-02', amount: 24.90 },
    { id: 'PLN-003', patient: 'Sophie M.', dietitian: 'Dr. A. Lemaire', objectif: 'Équilibre', status: 'pending', date: '2026-04-03', amount: 24.90 },
    { id: 'PLN-004', patient: 'Lucas B.', dietitian: 'C. Fontaine', objectif: 'Performance', status: 'completed', date: '2026-04-04', amount: 24.90 },
    { id: 'PLN-005', patient: 'Emma R.', dietitian: 'Grégoire Martin', objectif: 'Perte de poids', status: 'failed', date: '2026-04-05', amount: 24.90 },
    { id: 'PLN-006', patient: 'Paul L.', dietitian: 'Dr. A. Lemaire', objectif: 'Prévention', status: 'completed', date: '2026-04-06', amount: 24.90 }
  ];
}

/**
 * Charge les données financières
 */
async function loadFinanceData() {
  adminState.data.payments = [
    { id: 'PY-001', date: '2026-04-01', type: 'Plan patient', description: 'Plan PLN-001', amount: 24.90, status: 'completed' },
    { id: 'PY-002', date: '2026-04-02', type: 'Plan patient', description: 'Plan PLN-002', amount: 24.90, status: 'completed' },
    { id: 'PY-003', date: '2026-04-01', type: 'Abonnement', description: 'Abonnement Pro - Grégoire Martin', amount: 29.00, status: 'completed' },
    { id: 'PY-004', date: '2026-04-03', type: 'Crédits', description: 'Pack Standard - Antoine Durand', amount: 130.00, status: 'pending' },
    { id: 'PY-005', date: '2026-04-05', type: 'Visio', description: 'Visio - Marie D.', amount: 55.00, status: 'completed' }
  ];
}

// ==================== TABLEAUX ====================

/**
 * Affiche le tableau des utilisateurs
 */
function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  
  const users = adminState.data.users;
  const statusLabels = { active: 'Actif', inactive: 'Inactif' };
  const roleLabels = { patient: 'Patient', dietitian: 'Diététicien', prescriber: 'Prescripteur' };
  
  tbody.innerHTML = users.map(user => `
    <tr>
      <td><strong>${user.name}</strong></td>
      <td>${user.email}</td>
      <td><span class="admin-badge admin-badge-info">${roleLabels[user.role]}</span></td>
      <td><span class="admin-badge ${user.status === 'active' ? 'admin-badge-success' : 'admin-badge-danger'}">${statusLabels[user.status]}</span></td>
      <td>${user.created}</td>
      <td>${user.plans}</td>
      <td>
        <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="viewUser(${user.id})">Voir</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="toggleUserStatus(${user.id})">${user.status === 'active' ? 'Suspendre' : 'Activer'}</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Affiche le tableau des plans
 */
function renderPlansTable() {
  const tbody = document.getElementById('plansTableBody');
  if (!tbody) return;
  
  const plans = adminState.data.plans;
  const statusLabels = { completed: 'Validé', pending: 'En attente', failed: 'Échoué' };
  const statusClasses = { completed: 'admin-badge-success', pending: 'admin-badge-warning', failed: 'admin-badge-danger' };
  
  tbody.innerHTML = plans.map(plan => `
    <tr>
      <td>${plan.id}</td>
      <td><strong>${plan.patient}</strong></td>
      <td>${plan.dietitian}</td>
      <td>${plan.objectif}</td>
      <td><span class="admin-badge ${statusClasses[plan.status]}">${statusLabels[plan.status]}</span></td>
      <td>${plan.date}</td>
      <td>${plan.amount.toFixed(2)} €</td>
      <td>
        <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="viewPlan('${plan.id}')">Détails</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Affiche le tableau financier
 */
function renderFinanceTable() {
  const tbody = document.getElementById('financeTableBody');
  if (!tbody) return;
  
  const payments = adminState.data.payments;
  const statusLabels = { completed: 'Payé', pending: 'En attente', failed: 'Échoué' };
  const statusClasses = { completed: 'admin-badge-success', pending: 'admin-badge-warning', failed: 'admin-badge-danger' };
  
  tbody.innerHTML = payments.map(payment => `
    <tr>
      <td>${payment.date}</td>
      <td>${payment.type}</td>
      <td>${payment.description}</td>
      <td>${payment.amount.toFixed(2)} €</td>
      <td><span class="admin-badge ${statusClasses[payment.status]}">${statusLabels[payment.status]}</span></td>
      <td>
        <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="viewPayment('${payment.id}')">Facture</button>
      </td>
    </tr>
  `).join('');
}

// ==================== FONCTIONS DE TABLEAU (chargement conditionnel) ====================

function loadUsersTable() {
  renderUsersTable();
}

function loadPlansTable() {
  renderPlansTable();
}

function loadFinanceData() {
  renderFinanceTable();
}

// ==================== ACTIONS UTILISATEURS ====================

function viewUser(userId) {
  const user = adminState.data.users.find(u => u.id === userId);
  if (user) {
    alert(`Fiche utilisateur: ${user.name}\nEmail: ${user.email}\nRôle: ${user.role}\nStatut: ${user.status}`);
  }
}

function toggleUserStatus(userId) {
  const user = adminState.data.users.find(u => u.id === userId);
  if (user) {
    user.status = user.status === 'active' ? 'inactive' : 'active';
    renderUsersTable();
    showToast(`Utilisateur ${user.name} ${user.status === 'active' ? 'activé' : 'suspendu'}`, 'success');
  }
}

function viewPlan(planId) {
  const plan = adminState.data.plans.find(p => p.id === planId);
  if (plan) {
    alert(`Plan ${plan.id}\nPatient: ${plan.patient}\nDiététicien: ${plan.dietitian}\nObjectif: ${plan.objectif}\nStatut: ${plan.status}`);
  }
}

function viewPayment(paymentId) {
  alert(`Téléchargement de la facture ${paymentId}...`);
}

// ==================== ÉVÉNEMENTS ====================

/**
 * Initialise les événements globaux
 */
function initAdminEvents() {
  // Recherche dans les tableaux
  const searchInput = document.getElementById('adminSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      filterAdminTables(term);
    });
  }
  
  // Rafraîchissement des données
  const refreshBtn = document.getElementById('refreshData');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAdminData();
      showToast('Données actualisées', 'success');
    });
  }
  
  // Export CSV
  const exportBtn = document.getElementById('exportCSV');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportCurrentTableCSV();
    });
  }
}

/**
 * Filtre les tableaux selon un terme de recherche
 * @param {string} term - Terme de recherche
 */
function filterAdminTables(term) {
  if (!term) {
    // Réinitialiser l'affichage
    if (adminState.currentSection === 'users') renderUsersTable();
    else if (adminState.currentSection === 'plans') renderPlansTable();
    else if (adminState.currentSection === 'finance') renderFinanceTable();
    return;
  }
  
  let filtered = [];
  if (adminState.currentSection === 'users') {
    filtered = adminState.data.users.filter(u => 
      u.name.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term)
    );
    renderFilteredUsersTable(filtered);
  } else if (adminState.currentSection === 'plans') {
    filtered = adminState.data.plans.filter(p => 
      p.id.toLowerCase().includes(term) || 
      p.patient.toLowerCase().includes(term) ||
      p.dietitian.toLowerCase().includes(term)
    );
    renderFilteredPlansTable(filtered);
  } else if (adminState.currentSection === 'finance') {
    filtered = adminState.data.payments.filter(p => 
      p.description.toLowerCase().includes(term) ||
      p.type.toLowerCase().includes(term)
    );
    renderFilteredFinanceTable(filtered);
  }
}

function renderFilteredUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  const statusLabels = { active: 'Actif', inactive: 'Inactif' };
  const roleLabels = { patient: 'Patient', dietitian: 'Diététicien', prescriber: 'Prescripteur' };
  tbody.innerHTML = users.map(user => `
    <tr>
      <td><strong>${user.name}</strong></td>
      <td>${user.email}</td>
      <td><span class="admin-badge admin-badge-info">${roleLabels[user.role]}</span></td>
      <td><span class="admin-badge ${user.status === 'active' ? 'admin-badge-success' : 'admin-badge-danger'}">${statusLabels[user.status]}</span></td>
      <td>${user.created}</td>
      <td>${user.plans}</td>
      <td>
        <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="viewUser(${user.id})">Voir</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="toggleUserStatus(${user.id})">${user.status === 'active' ? 'Suspendre' : 'Activer'}</button>
      </td>
    </tr>
  `).join('');
}

function renderFilteredPlansTable(plans) {
  const tbody = document.getElementById('plansTableBody');
  if (!tbody) return;
  const statusLabels = { completed: 'Validé', pending: 'En attente', failed: 'Échoué' };
  const statusClasses = { completed: 'admin-badge-success', pending: 'admin-badge-warning', failed: 'admin-badge-danger' };
  tbody.innerHTML = plans.map(plan => `
    <tr>
      <td>${plan.id}</td>
      <td><strong>${plan.patient}</strong></td>
      <td>${plan.dietitian}</td>
      <td>${plan.objectif}</td>
      <td><span class="admin-badge ${statusClasses[plan.status]}">${statusLabels[plan.status]}</span></td>
      <td>${plan.date}</td>
      <td>${plan.amount.toFixed(2)} €</td>
      <td><button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="viewPlan('${plan.id}')">Détails</button></td>
    </tr>
  `).join('');
}

function renderFilteredFinanceTable(payments) {
  const tbody = document.getElementById('financeTableBody');
  if (!tbody) return;
  const statusLabels = { completed: 'Payé', pending: 'En attente', failed: 'Échoué' };
  const statusClasses = { completed: 'admin-badge-success', pending: 'admin-badge-warning', failed: 'admin-badge-danger' };
  tbody.innerHTML = payments.map(payment => `
    <tr>
      <td>${payment.date}</td>
      <td>${payment.type}</td>
      <td>${payment.description}</td>
      <td>${payment.amount.toFixed(2)} €</td>
      <td><span class="admin-badge ${statusClasses[payment.status]}">${statusLabels[payment.status]}</span></td>
      <td><button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="viewPayment('${payment.id}')">Facture</button></td>
    </tr>
  `).join('');
}

/**
 * Exporte le tableau actuel en CSV
 */
function exportCurrentTableCSV() {
  let csv = '';
  let filename = '';
  
  if (adminState.currentSection === 'users') {
    csv = 'Nom,Email,Rôle,Statut,Date inscription,Plans\n';
    adminState.data.users.forEach(u => {
      csv += `${u.name},${u.email},${u.role},${u.status},${u.created},${u.plans}\n`;
    });
    filename = 'utilisateurs.csv';
  } else if (adminState.currentSection === 'plans') {
    csv = 'ID,Patient,Diététicien,Objectif,Statut,Date,Montant\n';
    adminState.data.plans.forEach(p => {
      csv += `${p.id},${p.patient},${p.dietitian},${p.objectif},${p.status},${p.date},${p.amount}\n`;
    });
    filename = 'plans.csv';
  } else if (adminState.currentSection === 'finance') {
    csv = 'Date,Type,Description,Montant,Statut\n';
    adminState.data.payments.forEach(p => {
      csv += `${p.date},${p.type},${p.description},${p.amount},${p.status}\n`;
    });
    filename = 'transactions.csv';
  }
  
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast('Export CSV effectué', 'success');
}

// ==================== MODALES ====================

/**
 * Ouvre une modale de confirmation
 * @param {string} title - Titre de la modale
 * @param {string} message - Message de confirmation
 * @param {Function} onConfirm - Callback de confirmation
 */
function openConfirmModal(title, message, onConfirm) {
  const modal = document.getElementById('adminConfirmModal');
  if (!modal) return;
  
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMessage').textContent = message;
  
  const confirmBtn = document.getElementById('confirmModalConfirm');
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newConfirmBtn.addEventListener('click', () => {
    closeAdminModal();
    if (onConfirm) onConfirm();
  });
  
  modal.classList.add('open');
}

/**
 * Ferme la modale
 */
function closeAdminModal() {
  const modal = document.getElementById('adminConfirmModal');
  if (modal) modal.classList.remove('open');
}

// ==================== TOAST ====================

/**
 * Affiche un toast de notification
 * @param {string} message - Message à afficher
 * @param {string} type - Type ('success', 'error', 'warning')
 */
function showAdminToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Alias pour compatibilité
window.showToast = showAdminToast;

// ==================== EXPORTS GLOBAUX ====================

window.initAdmin = initAdmin;
window.switchAdminSection = switchAdminSection;
window.viewUser = viewUser;
window.toggleUserStatus = toggleUserStatus;
window.viewPlan = viewPlan;
window.viewPayment = viewPayment;
window.openConfirmModal = openConfirmModal;
window.closeAdminModal = closeAdminModal;
window.exportCurrentTableCSV = exportCurrentTableCSV;

// Auto-initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}

console.log('[admin.js] ✅ Chargé avec succès');