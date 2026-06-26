// GDJV – Google Apps Script v4

function doGet(e) {
  const action = e.parameter.action;
  let result;
  if (action === 'getInventaire')        result = getInventaire();
  else if (action === 'getReservations') result = getReservations();
  else if (action === 'getHistorique')   result = getHistorique();
  else result = { error: 'Action inconnue' };
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result;
  if (action === 'addReservation')         result = addReservation(data);
  else if (action === 'updateReservation') result = updateReservation(data);
  else if (action === 'confirmerDepart')   result = confirmerDepart(data);
  else if (action === 'addRetour')         result = addRetour(data);
  else if (action === 'addCommentaire')    result = addCommentaire(data);
  else result = { error: 'Action inconnue' };
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// ── HELPERS ───────────────────────────────────────────────────

// Retourne un map { nomColonne: indexBase1 } pour un sheet
function colMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    if (h) {
      const key = String(h).trim();
      map[key] = i + 1;
      map[key.toLowerCase()] = i + 1; // alias minuscule pour lookups insensibles à la casse
    }
  });
  return map;
}

function normStatut(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

// Cherche une colonne par plusieurs noms possibles (gestion casse / accents variables)
function getCol(map, ...keys) {
  for (const k of keys) { if (map[k]) return map[k]; }
  return null;
}

// ── INVENTAIRE ────────────────────────────────────────────────

function getInventaire() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventaire');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const items = rows.slice(1).filter(r => r[0]).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return { items };
}

function updateDisponible(ref, delta) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventaire');
  const cols = colMap(sheet);
  const colRef = cols['Référence'] || cols['Reference'] || 1;
  const colDispo = cols['Disponible'] || 6;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][colRef - 1] === ref) {
      const current = parseInt(rows[i][colDispo - 1]) || 0;
      sheet.getRange(i + 1, colDispo).setValue(Math.max(0, current + delta));
      return;
    }
  }
}

function appendNote(ref, texte) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventaire');
  const cols = colMap(sheet);
  const colRef = cols['Référence'] || cols['Reference'] || 1;
  const colNotes = cols['Notes'] || 8;
  const rows = sheet.getDataRange().getValues();
  const dateNow = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][colRef - 1] === ref) {
      const current = rows[i][colNotes - 1] ? String(rows[i][colNotes - 1]) : '';
      const newNote = dateNow + ' - ' + texte;
      sheet.getRange(i + 1, colNotes).setValue(current ? current + ' | ' + newNote : newNote);
      return;
    }
  }
}

function addCommentaire(data) {
  if (!data.ref || !data.texte) return { error: 'Données manquantes' };
  appendNote(data.ref, data.texte);
  return { success: true };
}

// ── RÉSERVATIONS ──────────────────────────────────────────────

function getReservations() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Réservations');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const reservations = rows.slice(1).filter(r => r[0]).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return { reservations };
}

function checkConflits(materiel, dateDepart, dateRetour, excludeId) {
  const invSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventaire');
  const invCols = colMap(invSheet);
  const colRef = invCols['Référence'] || invCols['Reference'] || 1;
  const colTotal = invCols['Total'] || 5;
  const invRows = invSheet.getDataRange().getValues();
  const totaux = {};
  invRows.slice(1).forEach(r => { if (r[colRef - 1]) totaux[r[colRef - 1]] = parseInt(r[colTotal - 1]) || 0; });

  const resSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Réservations');
  const resCols = colMap(resSheet);
  const colId = resCols['id'] || 1;
  const colMat = resCols['Matériel'] || resCols['Materiel'] || 5;
  const colDep = resCols['Dates départ'] || resCols['Dates depart'] || 7;
  const colRet = resCols['Date retour'] || 8;
  const colSt = resCols['Statut'] || 9;

  const resRows = resSheet.getDataRange().getValues();
  const d1 = new Date(dateDepart), d2 = new Date(dateRetour);
  const reserves = {};
  resRows.slice(1).forEach(r => {
    if (!r[colId - 1] || r[colId - 1] === excludeId) return;
    const st = normStatut(r[colSt - 1]);
    if (st === 'refuse' || st === 'retourne') return;
    const rd1 = new Date(r[colDep - 1]), rd2 = new Date(r[colRet - 1]);
    if (d1 <= rd2 && d2 >= rd1) {
      try {
        JSON.parse(r[colMat - 1] || '[]').forEach(m => {
          reserves[m.ref] = (reserves[m.ref] || 0) + (parseInt(m.qty) || 1);
        });
      } catch(e) {}
    }
  });

  const conflits = [];
  try {
    JSON.parse(materiel || '[]').forEach(m => {
      const total = totaux[m.ref] || 0;
      const dispo = total - (reserves[m.ref] || 0);
      if ((parseInt(m.qty) || 1) > dispo) {
        conflits.push({ ref: m.ref, nom: m.nom, demande: parseInt(m.qty) || 1, dispo: Math.max(0, dispo) });
      }
    });
  } catch(e) {}
  return conflits;
}

function addReservation(data) {
  const conflits = checkConflits(data.materiel, data.dateDepart, data.dateRetour, null);
  if (conflits.length > 0) return { error: 'CONFLICT', details: conflits };

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Réservations');
  const cols = colMap(sheet);
  const id = 'RES-' + new Date().getTime();
  const dateNow = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');

  // Construit la ligne selon les colonnes réelles du sheet
  const lastCol = sheet.getLastColumn();
  const row = new Array(lastCol).fill('');
  const set = (name, val) => { const c = cols[name] || cols[name.toLowerCase()]; if (c) row[c - 1] = val; };
  set('id', id);
  set('Date demande', dateNow);
  set('Camp', data.camp);
  set('Directeur', data.directeur);
  set('Matériel', data.materiel);
  set('Dates départ', data.dateDepart);
  set('Date retour', data.dateRetour);
  set('Statut', 'En attente');
  set('Notes', data.notes || '');
  sheet.appendRow(row);

  logHistorique('Réservation', id, data.camp, data.directeur, 'Nouvelle demande — départ ' + data.dateDepart);
  return { success: true, id };
}

function updateReservation(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Réservations');
  const cols = colMap(sheet);
  const colId = cols['id'] || 1;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][colId - 1] === data.id) {
      const setCol = (name, val) => { const c = cols[name]; if (c && val !== undefined) sheet.getRange(i + 1, c).setValue(val); };
      setCol('Camp', data.camp);
      setCol('Directeur', data.directeur);
      setCol('Matériel', data.materiel);
      setCol('Dates départ', data.dateDepart);
      setCol('Date retour', data.dateRetour);
      setCol('Notes', data.notes);
      logHistorique('Modification', data.id, data.camp || rows[i][2], data.directeur || rows[i][3],
        'Réservation modifiée le ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'));
      return { success: true };
    }
  }
  return { error: 'Réservation non trouvée' };
}

function confirmerDepart(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Réservations');
  const cols = colMap(sheet);
  const colId = cols['id'] || 1;
  const colMatDep = cols['Matériel au départ'] || cols['Materiel au depart'];
  const colStatut = cols['Statut'] || 9;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][colId - 1] === data.id) {
      if (colMatDep) sheet.getRange(i + 1, colMatDep).setValue(JSON.stringify(data.materielAuDepart || []));
      sheet.getRange(i + 1, colStatut).setValue('Parti');
      (data.materielAuDepart || []).forEach(m => updateDisponible(m.ref, -(parseInt(m.qty) || 1)));
      logHistorique('Parti', data.id, rows[i][cols['Camp'] - 1] || rows[i][2],
        rows[i][cols['Directeur'] - 1] || rows[i][3],
        'Départ confirmé — ' + (data.materielAuDepart || []).length + ' article(s)');
      return { success: true };
    }
  }
  return { error: 'Réservation non trouvée' };
}

// ── RETOURS ───────────────────────────────────────────────────

function addRetour(data) {
  const dateNow = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const errors = [];

  // 1. Enregistrement dans Retours
  try {
    const retSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Retours');
    data.articles.forEach(article => {
      retSheet.appendRow([data.reservationId, data.camp, data.directeur, article.ref, article.nom,
        article.qteRetournee || '', article.etat, article.observations || '', dateNow]);
    });
  } catch(e) { errors.push('Retours: ' + e.message); }

  // 2. Mise à jour Disponible + Notes inventaire
  data.articles.forEach(article => {
    try {
      const qte = parseInt(article.qteRetournee) || 0;
      if (qte > 0) updateDisponible(article.ref, qte);
    } catch(e) { errors.push('Dispo ' + article.ref + ': ' + e.message); }
    try {
      if (article.observations && String(article.observations).trim()) {
        appendNote(article.ref, String(article.observations).trim());
      }
    } catch(e) { errors.push('Note ' + article.ref + ': ' + e.message); }
  });

  // 3. Statut → Retourné (toujours exécuté)
  try {
    const resSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Réservations');
    const cols = colMap(resSheet);
    const colId = cols['id'] || 1;
    const colStatut = cols['Statut'];
    if (!colStatut) throw new Error('Colonne Statut introuvable');
    const resRows = resSheet.getDataRange().getValues();
    for (let i = 1; i < resRows.length; i++) {
      if (String(resRows[i][colId - 1]) === String(data.reservationId)) {
        resSheet.getRange(i + 1, colStatut).setValue('Retourné');
        break;
      }
    }
  } catch(e) { errors.push('Statut: ' + e.message); }

  logHistorique('Retour', data.reservationId, data.camp, data.directeur, 'Retour enregistré le ' + dateNow);
  return errors.length ? { success: true, warnings: errors } : { success: true };
}

// ── HISTORIQUE ────────────────────────────────────────────────

function logHistorique(type, resId, camp, directeur, detail) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Historique');
  if (!sheet) return;
  const now = new Date();
  const dateNow = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const timeNow = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm');
  sheet.appendRow([dateNow + ' ' + timeNow, type, resId, camp, directeur, detail]);
}

function getHistorique() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Historique');
  if (!sheet) return { mouvements: [] };
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const mouvements = rows.slice(1).filter(r => r[0]).reverse().map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  return { mouvements };
}
