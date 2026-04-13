/**
 * export-csv.js — NutriDoc · Export CSV pour prescripteurs
 * 
 * Fonctionnalités :
 * - Export de la liste des clients
 * - Export des mesures de poids
 * - Export des plans validés
 * - Export complet du CRM
 * - Personnalisation des colonnes
 * 
 * Version: 1.0.0
 */

// ==================== CONFIGURATION ====================

const CSV_CONFIG = {
  // Séparateur (; pour Excel français)
  delimiter: ';',
  
  // Encodage (UTF-8 avec BOM pour Excel)
  encoding: 'UTF-8',
  
  // Format des dates
  dateFormat: 'DD/MM/YYYY',
  
  // Décimales pour les nombres
  decimalPlaces: 1
};

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Exporte la liste des clients vers CSV
 * @param {Array} clients - Liste des clients (optionnel, sinon charge depuis localStorage)
 * @param {Object} options - Options d'export
 */
function exportClientsCSV(clients = null, options = {}) {
  // Charger les clients si non fournis
  const clientList = clients || loadClientsFromStorage();
  
  if (!clientList || clientList.length === 0) {
    showToast('Aucun client à exporter', 'warning');
    return;
  }
  
  const {
    columns = ['prenom', 'nom', 'age', 'poidsInitial', 'taille', 'objectif', 'statut', 'dateCreation', 'derniereMesure', 'evolution'],
    filename = `clients_nutridoc_${formatDateForFilename(new Date())}.csv`
  } = options;
  
  // Préparer les données
  const data = clientList.map(client => formatClientForExport(client));
  
  // Générer le CSV
  const csv = generateCSV(data, columns);
  
  // Télécharger
  downloadCSV(csv, filename);
  
  showToast(`${clientList.length} clients exportés avec succès`, 'success');
  return csv;
}

/**
 * Exporte l'historique des mesures de poids
 * @param {string} clientId - ID du client (optionnel, null = tous les clients)
 */
function exportMeasuresCSV(clientId = null) {
  const clients = loadClientsFromStorage();
  let measures = [];
  
  if (clientId) {
    // Export pour un client spécifique
    const client = clients.find(c => c.id === clientId);
    if (client && client.mesures) {
      measures = client.mesures.map(m => ({
        client: `${client.prenom} ${client.nom || ''}`,
        date: m.date,
        poids: m.poids,
        objectif: client.objectif,
        poidsInitial: client.poidsInitial,
        evolution: calculateEvolution(client.poidsInitial, m.poids)
      }));
    }
  } else {
    // Export pour tous les clients
    for (const client of clients) {
      if (client.mesures && client.mesures.length > 0) {
        for (const mesure of client.mesures) {
          measures.push({
            client: `${client.prenom} ${client.nom || ''}`,
            clientId: client.id,
            date: mesure.date,
            poids: mesure.poids,
            objectif: client.objectif,
            poidsInitial: client.poidsInitial,
            taille: client.taille,
            imc: calculateBMI(client.poidsInitial, client.taille),
            evolution: calculateEvolution(client.poidsInitial, mesure.poids)
          });
        }
      }
    }
  }
  
  if (measures.length === 0) {
    showToast('Aucune mesure à exporter', 'warning');
    return;
  }
  
  const columns = ['client', 'date', 'poids', 'objectif', 'poidsInitial', 'evolution', 'imc'];
  const filename = clientId 
    ? `mesures_client_${clientId}_${formatDateForFilename(new Date())}.csv`
    : `mesures_tous_clients_${formatDateForFilename(new Date())}.csv`;
  
  const csv = generateCSV(measures, columns);
  downloadCSV(csv, filename);
  
  showToast(`${measures.length} mesures exportées`, 'success');
}

/**
 * Exporte les plans validés
 * @param {string} clientId - ID du client (optionnel)
 */
function exportPlansCSV(clientId = null) {
  const clients = loadClientsFromStorage();
  let plans = [];
  
  for (const client of clients) {
    if (client.plans && client.plans.length > 0) {
      if (!clientId || client.id === clientId) {
        for (const plan of client.plans) {
          plans.push({
            client: `${client.prenom} ${client.nom || ''}`,
            clientId: client.id,
            objectif: plan.objectif,
            statut: plan.statut,
            date: plan.date,
            type: plan.type || 'plan_standard',
            notes: plan.notes || ''
          });
        }
      }
    }
  }
  
  if (plans.length === 0) {
    showToast('Aucun plan à exporter', 'warning');
    return;
  }
  
  const columns = ['client', 'objectif', 'statut', 'date', 'type', 'notes'];
  const filename = `plans_valides_${formatDateForFilename(new Date())}.csv`;
  
  const csv = generateCSV(plans, columns);
  downloadCSV(csv, filename);
  
  showToast(`${plans.length} plans exportés`, 'success');
}

/**
 * Export complet du CRM (toutes les données)
 */
function exportFullCRM() {
  const clients = loadClientsFromStorage();
  
  const exportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    clients: clients.map(client => ({
      ...client,
      mesures: client.mesures || [],
      plans: client.plans || []
    }))
  };
  
  // Version CSV simplifiée
  const simplifiedClients = clients.map(client => ({
    prenom: client.prenom,
    nom: client.nom || '',
    age: client.age || '',
    poidsInitial: client.poidsInitial || '',
    poidsActuel: client.mesures?.length > 0 ? client.mesures[client.mesures.length - 1].poids : '',
    taille: client.taille || '',
    objectif: client.objectif || '',
    statut: client.statut || '',
    nbMesures: client.mesures?.length || 0,
    nbPlans: client.plans?.length || 0,
    dateCreation: client.date || '',
    dernierSuivi: client.mesures?.length > 0 ? client.mesures[client.mesures.length - 1].date : '',
    evolution: client.mesures?.length > 1 
      ? calculateEvolution(client.mesures[0].poids, client.mesures[client.mesures.length - 1].poids)
      : ''
  }));
  
  const columns = ['prenom', 'nom', 'age', 'poidsInitial', 'poidsActuel', 'taille', 'objectif', 'statut', 'nbMesures', 'nbPlans', 'dateCreation', 'dernierSuivi', 'evolution'];
  const csv = generateCSV(simplifiedClients, columns);
  const filename = `export_complet_crm_${formatDateForFilename(new Date())}.csv`;
  
  downloadCSV(csv, filename);
  
  // Optionnel : aussi exporter en JSON
  const jsonStr = JSON.stringify(exportData, null, 2);
  downloadJSON(jsonStr, `export_complet_crm_${formatDateForFilename(new Date())}.json`);
  
  showToast('Export complet terminé (CSV + JSON)', 'success');
}

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Charge les clients depuis localStorage
 */
function loadClientsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('nutridoc_crm_clients') || '[]');
  } catch (e) {
    console.error('[Export] Erreur chargement clients:', e);
    return [];
  }
}

/**
 * Formate un client pour l'export
 */
function formatClientForExport(client) {
  const derniereMesure = client.mesures?.length > 0 
    ? client.mesures[client.mesures.length - 1].poids 
    : '';
  
  const premiereMesure = client.mesures?.length > 0 
    ? client.mesures[0].poids 
    : client.poidsInitial;
  
  const evolution = (premiereMesure && derniereMesure) 
    ? calculateEvolution(premiereMesure, derniereMesure)
    : '';
  
  return {
    id: client.id,
    prenom: client.prenom || '',
    nom: client.nom || '',
    age: client.age || '',
    poidsInitial: client.poidsInitial || '',
    poidsActuel: derniereMesure,
    taille: client.taille || '',
    objectif: client.objectif || '',
    objectifLabel: getObjectifLabel(client.objectif),
    statut: client.statut || 'en_cours',
    statutLabel: getStatutLabel(client.statut),
    nbMesures: client.mesures?.length || 0,
    nbPlans: client.plans?.length || 0,
    dateCreation: formatDate(client.date),
    derniereMesure: client.mesures?.length > 0 ? formatDate(client.mesures[client.mesures.length - 1].date) : '',
    evolution: evolution,
    notes: (client.notes || '').substring(0, 200),
    rappelDate: client.rappelDate ? formatDate(client.rappelDate) : ''
  };
}

/**
 * Génère le CSV à partir des données
 */
function generateCSV(data, columns) {
  if (!data || data.length === 0) return '';
  
  // En-têtes (traduits en français)
  const headers = columns.map(col => getColumnHeader(col));
  const rows = [headers];
  
  // Lignes de données
  for (const item of data) {
    const row = columns.map(col => {
      let value = item[col];
      
      // Formatage spécial selon le type
      if (col === 'date' || col === 'dateCreation' || col === 'derniereMesure' || col === 'rappelDate') {
        value = formatDate(value);
      } else if (col === 'evolution' && value) {
        value = formatEvolution(value);
      } else if (typeof value === 'number') {
        value = formatNumber(value);
      } else if (value === null || value === undefined) {
        value = '';
      }
      
      // Échapper les guillemets et les séparateurs
      return escapeCSV(String(value));
    });
    rows.push(row);
  }
  
  // Joindre les lignes
  return rows.map(row => row.join(CSV_CONFIG.delimiter)).join('\n');
}

/**
 * Échappe une valeur pour CSV
 */
function escapeCSV(value) {
  if (value.includes(CSV_CONFIG.delimiter) || value.includes('"') || value.includes('\n')) {
    value = value.replace(/"/g, '""');
    return `"${value}"`;
  }
  return value;
}

/**
 * Télécharge un fichier CSV
 */
function downloadCSV(csvContent, filename) {
  // Ajouter BOM pour UTF-8 (compatibilité Excel)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Télécharge un fichier JSON
 */
function downloadJSON(jsonContent, filename) {
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formate une date pour l'affichage
 */
function formatDate(dateInput) {
  if (!dateInput) return '';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return dateInput;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formate une date pour un nom de fichier
 */
function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}`;
}

/**
 * Formate un nombre
 */
function formatNumber(value) {
  if (value === null || value === undefined) return '';
  return parseFloat(value).toFixed(CSV_CONFIG.decimalPlaces).replace('.', ',');
}

/**
 * Formate l'évolution avec signe
 */
function formatEvolution(value) {
  if (!value) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)} kg`;
}

/**
 * Calcule l'évolution
 */
function calculateEvolution(start, end) {
  if (!start || !end) return '';
  const evolution = parseFloat(end) - parseFloat(start);
  return evolution.toFixed(1);
}

/**
 * Calcule l'IMC
 */
function calculateBMI(weight, heightCm) {
  if (!weight || !heightCm) return '';
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  return bmi.toFixed(1);
}

/**
 * Retourne le libellé d'un objectif
 */
function getObjectifLabel(objectif) {
  const labels = {
    perte_poids: 'Perte de poids',
    prise_masse: 'Prise de masse',
    reequilibrage: 'Rééquilibrage',
    perte_gras: 'Perte de gras',
    sante: 'Prévention santé',
    equilibre: 'Équilibre alimentaire'
  };
  return labels[objectif] || objectif || '';
}

/**
 * Retourne le libellé d'un statut
 */
function getStatutLabel(statut) {
  const labels = {
    en_cours: 'En cours',
    atteint: 'Objectif atteint',
    pause: 'En pause',
    abandon: 'Abandon'
  };
  return labels[statut] || statut || '';
}

/**
 * Retourne l'en-tête d'une colonne
 */
function getColumnHeader(col) {
  const headers = {
    id: 'ID',
    prenom: 'Prénom',
    nom: 'Nom',
    age: 'Âge',
    poidsInitial: 'Poids initial (kg)',
    poidsActuel: 'Poids actuel (kg)',
    taille: 'Taille (cm)',
    objectif: 'Objectif (code)',
    objectifLabel: 'Objectif',
    statut: 'Statut (code)',
    statutLabel: 'Statut',
    nbMesures: 'Nombre de mesures',
    nbPlans: 'Nombre de plans',
    dateCreation: 'Date de création',
    derniereMesure: 'Dernière mesure',
    evolution: 'Évolution (kg)',
    notes: 'Notes',
    rappelDate: 'Date de rappel',
    date: 'Date',
    poids: 'Poids (kg)',
    imc: 'IMC',
    client: 'Client',
    clientId: 'ID Client'
  };
  return headers[col] || col;
}

// ==================== INTERFACE UTILISATEUR ====================

/**
 * Crée un bouton d'export dans l'interface
 */
function createExportButton(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const {
    type = 'clients', // 'clients', 'measures', 'plans', 'full'
    label = '📥 Exporter',
    className = 'btn-export'
  } = options;
  
  const button = document.createElement('button');
  button.textContent = label;
  button.className = className;
  button.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #1D9E75;
    color: white;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.02)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
  });
  
  switch (type) {
    case 'clients':
      button.onclick = () => exportClientsCSV();
      break;
    case 'measures':
      button.onclick = () => exportMeasuresCSV();
      break;
    case 'plans':
      button.onclick = () => exportPlansCSV();
      break;
    case 'full':
      button.onclick = () => exportFullCRM();
      break;
  }
  
  container.appendChild(button);
}

/**
 * Crée un menu déroulant d'export
 */
function createExportDropdown(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const dropdown = document.createElement('div');
  dropdown.className = 'export-dropdown';
  dropdown.style.cssText = `
    position: relative;
    display: inline-block;
  `;
  
  dropdown.innerHTML = `
    <button class="export-dropdown-btn" style="
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #1D9E75;
      color: white;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    ">
      📥 Exporter ▾
    </button>
    <div class="export-dropdown-content" style="
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      min-width: 200px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.1);
      border-radius: 12px;
      z-index: 100;
      margin-top: 4px;
      overflow: hidden;
    ">
      <button data-type="clients" style="
        display: block;
        width: 100%;
        padding: 10px 16px;
        text-align: left;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
      ">📋 Clients</button>
      <button data-type="measures" style="
        display: block;
        width: 100%;
        padding: 10px 16px;
        text-align: left;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
      ">📊 Mesures de poids</button>
      <button data-type="plans" style="
        display: block;
        width: 100%;
        padding: 10px 16px;
        text-align: left;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
      ">📄 Plans validés</button>
      <button data-type="full" style="
        display: block;
        width: 100%;
        padding: 10px 16px;
        text-align: left;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
        border-top: 1px solid #eef4ee;
        color: #1D9E75;
        font-weight: 500;
      ">📦 Export complet (CSV+JSON)</button>
    </div>
  `;
  
  // Toggle du dropdown
  const btn = dropdown.querySelector('.export-dropdown-btn');
  const content = dropdown.querySelector('.export-dropdown-content');
  
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = content.style.display === 'block';
    content.style.display = isVisible ? 'none' : 'block';
  });
  
  // Actions des boutons
  content.querySelectorAll('[data-type]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = item.dataset.type;
      
      switch (type) {
        case 'clients':
          exportClientsCSV();
          break;
        case 'measures':
          exportMeasuresCSV();
          break;
        case 'plans':
          exportPlansCSV();
          break;
        case 'full':
          exportFullCRM();
          break;
      }
      
      content.style.display = 'none';
    });
  });
  
  // Fermer au clic extérieur
  document.addEventListener('click', () => {
    content.style.display = 'none';
  });
  
  container.appendChild(dropdown);
}

// ==================== EXPORTS GLOBAUX ====================

window.exportClientsCSV = exportClientsCSV;
window.exportMeasuresCSV = exportMeasuresCSV;
window.exportPlansCSV = exportPlansCSV;
window.exportFullCRM = exportFullCRM;
window.createExportButton = createExportButton;
window.createExportDropdown = createExportDropdown;

console.log('[export-csv.js] ✅ Chargé avec succès');