/**
 * HemaCalc AI - Patient Data & Calculation History Storage Manager
 * Uses LocalStorage to persist user input drafts and comprehensive calculation history.
 */

const STORAGE_KEY_HISTORY = 'hemacalc_patient_history_v1';
const STORAGE_KEY_DRAFT = 'hemacalc_form_draft_v1';
const MAX_HISTORY_ITEMS = 60;

/**
 * Formats date into readable Thai locale string
 */
export function formatThaiDateTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

/**
 * Saves current form draft so refreshing doesn't lose user data
 */
export function saveFormDraft(formData) {
  try {
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify({
      ...formData,
      savedAt: Date.now()
    }));
  } catch (err) {
    console.warn('Failed to save form draft:', err);
  }
}

/**
 * Loads current form draft
 */
export function loadFormDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clears form draft
 */
export function clearFormDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
  } catch (err) {
    console.warn('Failed to clear form draft:', err);
  }
}

/**
 * Retrieves all saved calculation history
 */
export function getCalculationHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('Failed to load calculation history:', err);
    return [];
  }
}

/**
 * Saves a new calculation to history
 * @param {Object} calcResult - Full result object from calculateRBCIndices
 * @returns {Object} Saved history record
 */
export function saveCalculationToHistory(calcResult) {
  try {
    const history = getCalculationHistory();

    const record = {
      id: 'calc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      displayDate: formatThaiDateTime(new Date().toISOString()),
      inputs: { ...calcResult.inputs },
      indices: { ...calcResult.indices },
      demoRef: { ...calcResult.demoRef },
      evaluations: { ...calcResult.evaluations },
      morphology: { ...calcResult.morphology },
      aiAnalysis: null
    };

    // Add to front of history
    const updated = [record, ...history].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
    return record;
  } catch (err) {
    console.warn('Failed to save calculation to history:', err);
    return null;
  }
}

/**
 * Updates AI analysis text for an existing calculation record
 */
export function updateHistoryAiAnalysis(id, aiMarkdown) {
  if (!id) return;
  try {
    const history = getCalculationHistory();
    const idx = history.findIndex(item => item.id === id);
    if (idx !== -1) {
      history[idx].aiAnalysis = aiMarkdown;
      history[idx].aiUpdatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }
  } catch (err) {
    console.warn('Failed to update AI analysis in history:', err);
  }
}

/**
 * Deletes a single history record by ID
 */
export function deleteHistoryItem(id) {
  try {
    const history = getCalculationHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.warn('Failed to delete history item:', err);
    return getCalculationHistory();
  }
}

/**
 * Clears all calculation history
 */
export function clearAllHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  } catch (err) {
    console.warn('Failed to clear all history:', err);
  }
}

/**
 * Exports history data as downloadable JSON file
 */
export function exportHistoryAsJSON() {
  const history = getCalculationHistory();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `hemacalc-history-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
