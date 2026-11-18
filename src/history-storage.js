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
      indicesRef: { ...calcResult.indicesRef },
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
 * Exports history data as a printable PDF via browser print dialog.
 * Uses window.print() on a new window with styled HTML so Thai characters render correctly.
 */
export function exportHistoryAsPDF() {
  const history = getCalculationHistory();
  if (!history || history.length === 0) {
    alert('ไม่มีประวัติการคำนวณที่จะส่งออก');
    return;
  }

  const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  // Status label helper
  function statusLabel(val) {
    if (!val) return '-';
    if (val === 'low') return 'ต่ำ';
    if (val === 'high') return 'สูง';
    if (val === 'normal') return 'ปกติ';
    return val;
  }

  // Build HTML rows for each record
  const recordsHTML = history.map((rec, idx) => {
    const inp = rec.inputs || {};
    const idx2 = rec.indices || {};
    const ev = rec.evaluations || {};
    const morph = rec.morphology || {};
    const demo = rec.demoRef || {};

    const rows = [
      ['Hemoglobin (Hb)', `${inp.hemoglobin ?? '-'} g/dL`, statusLabel(ev.hb)],
      ['Hematocrit (Hct)', `${inp.hematocrit ?? '-'} %`, statusLabel(ev.hct)],
      ['RBC Count', `${inp.rbc ?? '-'} ×10⁶/µL`, statusLabel(ev.rbc)],
      ['MCV', `${typeof idx2.mcv === 'number' ? idx2.mcv.toFixed(1) : '-'} fL`, statusLabel(ev.mcv)],
      ['MCH', `${typeof idx2.mch === 'number' ? idx2.mch.toFixed(1) : '-'} pg`, statusLabel(ev.mch)],
      ['MCHC', `${typeof idx2.mchc === 'number' ? idx2.mchc.toFixed(1) : '-'} g/dL`, statusLabel(ev.mchc)],
      ['Mentzer Index', `${typeof idx2.mentzerIndex === 'number' ? idx2.mentzerIndex.toFixed(2) : '-'}`, '-'],
    ].map(([label, value, status]) =>
      `<tr>
        <td>${label}</td>
        <td>${value}</td>
        <td class="status-cell ${status === 'ต่ำ' ? 'low' : status === 'สูง' ? 'high' : 'normal'}">${status}</td>
      </tr>`
    ).join('');

    const sexLabel = inp.sex === 'male' ? 'ชาย' : inp.sex === 'female' ? 'หญิง' : '-';
    const morphLabel = morph.label || morph.conclusion || '-';

    const aiSection = rec.aiAnalysis
      ? `<div class="ai-section">
          <div class="ai-title">🤖 ผลวิเคราะห์ AI</div>
          <div class="ai-text">${rec.aiAnalysis.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
        </div>`
      : '';

    return `
      <div class="record-card">
        <div class="record-header">
          <span class="record-num">รายการที่ ${idx + 1}</span>
          <span class="record-date">📅 ${rec.displayDate || rec.createdAt || '-'}</span>
        </div>
        <div class="patient-info">
          <span>เพศ: <strong>${sexLabel}</strong></span>
          <span>อายุ: <strong>${inp.age ?? '-'} ปี</strong></span>
          <span>สัณฐานวิทยา: <strong>${morphLabel}</strong></span>
        </div>
        <table>
          <thead>
            <tr>
              <th>พารามิเตอร์</th>
              <th>ค่าที่ได้</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${aiSection}
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>HemaCalc AI - ประวัติการคำนวณ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Prompt', 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 11pt; color: #1a1a2e; background: #fff; padding: 16px; }
    .print-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e11d48; padding-bottom: 12px; }
    .print-header h1 { font-size: 18pt; color: #e11d48; font-weight: 700; }
    .print-header p { color: #555; font-size: 10pt; margin-top: 4px; }
    .record-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; page-break-inside: avoid; }
    .record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .record-num { font-weight: 700; font-size: 11pt; color: #e11d48; }
    .record-date { font-size: 9pt; color: #64748b; }
    .patient-info { display: flex; gap: 20px; font-size: 10pt; color: #334155; margin-bottom: 10px; flex-wrap: wrap; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 10px; }
    th { background: #fff1f2; color: #9f1239; font-weight: 600; padding: 6px 10px; text-align: left; border: 1px solid #fecdd3; }
    td { padding: 5px 10px; border: 1px solid #e2e8f0; }
    .status-cell.low { color: #0369a1; font-weight: 600; }
    .status-cell.high { color: #dc2626; font-weight: 600; }
    .status-cell.normal { color: #16a34a; font-weight: 600; }
    .ai-section { background: #f8fafc; border-left: 3px solid #6366f1; padding: 10px 12px; border-radius: 4px; }
    .ai-title { font-weight: 600; color: #4f46e5; margin-bottom: 6px; font-size: 10pt; }
    .ai-text { font-size: 9.5pt; color: #334155; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
    .print-footer { text-align: center; margin-top: 24px; font-size: 9pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .record-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <h1>🩸 HemaCalc AI — ประวัติการคำนวณ RBC Indices</h1>
    <p>ส่งออกเมื่อ: ${dateStr} &nbsp;|&nbsp; จำนวนรายการ: ${history.length} รายการ</p>
  </div>

  <div class="no-print" style="text-align:center;margin-bottom:16px;">
    <button onclick="window.print()" style="background:#e11d48;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:12pt;cursor:pointer;font-family:inherit;">🖨️ พิมพ์ / บันทึก PDF</button>
    <button onclick="window.close()" style="background:#64748b;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:12pt;cursor:pointer;font-family:inherit;margin-left:8px;">✖ ปิด</button>
  </div>

  ${recordsHTML}

  <div class="print-footer">
    สร้างโดย HemaCalc AI • ใช้สำหรับการศึกษาและสนับสนุนการวินิจฉัยทางคลินิกเท่านั้น
  </div>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!printWin) {
    alert('กรุณาอนุญาตให้เปิด Popup เพื่อส่งออก PDF');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}

