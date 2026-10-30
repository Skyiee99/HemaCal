/**
 * HemaCalc AI - Main Application Controller
 */

import { calculateRBCIndices } from './reference-ranges.js';
import { 
  getStoredApiKey, 
  saveStoredApiKey, 
  getStoredModel, 
  saveStoredModel, 
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  consultGeminiAPI, 
  generateOfflineExpertAnalysis 
} from './gemini-api.js';
import {
  saveFormDraft,
  loadFormDraft,
  clearFormDraft,
  getCalculationHistory,
  saveCalculationToHistory,
  updateHistoryAiAnalysis,
  deleteHistoryItem,
  clearAllHistory,
  exportHistoryAsJSON
} from './history-storage.js';
import { marked } from 'marked';

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

// App State
let currentCalculation = null;
let currentCalculationId = null;

// DOM Elements: Form
const form = document.getElementById('rbc-form');
const radioHbCalculated = document.getElementById('hb-mode-calculated');
const radioHbDirect = document.getElementById('hb-mode-direct');
const hbCalculatedInputs = document.getElementById('hb-calculated-inputs');
const hbDirectInput = document.getElementById('hb-direct-input');
const inputHbAbs = document.getElementById('input-hb-abs');
const inputHbFactor = document.getElementById('input-hb-factor');
const inputHbDirect = document.getElementById('input-hb-direct');
const calculatedHbValue = document.getElementById('calculated-hb-value');
const hbInputHint = document.getElementById('hb-input-hint');
const inputHct = document.getElementById('input-hct');
const inputRbcCount = document.getElementById('input-rbc-count');
const convertedRbcVal = document.getElementById('converted-rbc-val');
const inputAge = document.getElementById('input-age');
const radioSexMale = document.getElementById('radio-sex-male');
const radioSexFemale = document.getElementById('radio-sex-female');
const checkPregnancy = document.getElementById('check-pregnancy');
const pregnancyContainer = document.getElementById('pregnancy-container');

// Results elements
const emptyStateView = document.getElementById('empty-state-view');
const activeResultsView = document.getElementById('active-results-view');
const patientSummaryBadge = document.getElementById('patient-summary-badge');
const indicesTableBody = document.getElementById('indices-table-body');
const resultToolbar = document.getElementById('result-toolbar');

// Morphology elements
const morphSizeVal = document.getElementById('morph-size-val');
const morphChromicVal = document.getElementById('morph-chromic-val');
const morphDiagnosisPill = document.getElementById('morph-diagnosis-pill');
const mentzerVal = document.getElementById('mentzer-val');
const mentzerDesc = document.getElementById('mentzer-desc');

// AI elements
const aiPlaceholderView = document.getElementById('ai-placeholder-view');
const aiLoadingView = document.getElementById('ai-loading-view');
const aiMarkdownOutput = document.getElementById('ai-markdown-output');
const btnTriggerAi = document.getElementById('btn-trigger-ai');
const btnQuickAi = document.getElementById('btn-quick-ai');
const activeModelBadge = document.getElementById('active-model-badge');

// Header & Modals
const btnOpenApiModal = document.getElementById('btn-open-api-modal');
const apiStatusDot = document.getElementById('api-status-dot');
const apiStatusText = document.getElementById('api-status-text');
const apiModal = document.getElementById('api-modal');
const btnCloseApiModal = document.getElementById('btn-close-api-modal');
const btnCancelApiModal = document.getElementById('btn-cancel-api-modal');
const btnSaveApiKey = document.getElementById('btn-save-api-key');
const btnClearApiKey = document.getElementById('btn-clear-api-key');
const modalInputApiKey = document.getElementById('modal-input-api-key');
const modalSelectModel = document.getElementById('modal-select-model');
const btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');

const formulaModal = document.getElementById('formula-modal');
const btnFormulaInfo = document.getElementById('btn-formula-info');
const btnCloseFormula = document.getElementById('btn-close-formula');
const btnOkFormula = document.getElementById('btn-ok-formula');

// Quota Modal Elements
const quotaModal = document.getElementById('quota-modal');
const btnCloseQuotaModal = document.getElementById('btn-close-quota-modal');
const btnDismissQuota = document.getElementById('btn-dismiss-quota');
const btnQuotaUseOffline = document.getElementById('btn-quota-use-offline');
const btnQuotaTryLite = document.getElementById('btn-quota-try-lite');
const btnQuotaOpenKeyModal = document.getElementById('btn-quota-open-key-modal');

// History Elements
const btnOpenHistory = document.getElementById('btn-open-history');
const historyBadge = document.getElementById('history-badge');
const historyModal = document.getElementById('history-modal');
const btnCloseHistoryModal = document.getElementById('btn-close-history-modal');
const btnCloseHistoryFooter = document.getElementById('btn-close-history-footer');
const historyTotalLabel = document.getElementById('history-total-label');
const historyListContainer = document.getElementById('history-list-container');
const btnExportHistory = document.getElementById('btn-export-history');
const btnClearAllHistory = document.getElementById('btn-clear-all-history');

// Other Controls
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const btnReset = document.getElementById('btn-reset');
const btnCopyReport = document.getElementById('btn-copy-report');
const btnPrintReport = document.getElementById('btnPrintReport') || document.getElementById('btn-print-report');

// Clinical Presets Data
const PRESETS = {
  'normal-male': {
    name: 'ชายวัยผู้ใหญ่ปกติ (Normal Male Adult)',
    hb: 15.2,
    hct: 45.5,
    rbcCount: 495, // 4.95 x 10^6/uL
    age: 32,
    sex: 'male',
    isPregnant: false
  },
  'iron-deficiency': {
    name: 'โลหิตจางจากการขาดธาตุเหล็ก (Iron Deficiency Anemia)',
    hb: 9.2,
    hct: 29.5,
    rbcCount: 380, // 3.80 x 10^6/uL -> MCV = 77.6, MCH = 24.2, Mentzer = 20.4 (>13)
    age: 28,
    sex: 'female',
    isPregnant: false
  },
  'thalassemia-trait': {
    name: 'พาหะธาลัสซีเมีย (Thalassemia Trait)',
    hb: 10.8,
    hct: 34.0,
    rbcCount: 540, // 5.40 x 10^6/uL -> MCV = 63.0, MCH = 20.0, Mentzer = 11.7 (<13)
    age: 24,
    sex: 'female',
    isPregnant: false
  },
  'pregnancy': {
    name: 'หญิงตั้งครรภ์ (Pregnancy Hemodilution)',
    hb: 11.2,
    hct: 34.5,
    rbcCount: 390, // 3.90 x 10^6/uL
    age: 29,
    sex: 'female',
    isPregnant: true
  },
  'macrocytic': {
    name: 'เม็ดเลือดแดงขนาดใหญ่ / ขาด B12 หรือโฟเลต (Macrocytic Anemia)',
    hb: 10.5,
    hct: 31.0,
    rbcCount: 280, // 2.80 x 10^6/uL -> MCV = 110.7
    age: 68,
    sex: 'male',
    isPregnant: false
  },
  'pediatric': {
    name: 'เด็กปฐมวัย (Pediatric Case 3 ปี)',
    hb: 12.0,
    hct: 36.0,
    rbcCount: 435, // 4.35 x 10^6/uL
    age: 3,
    sex: 'male',
    isPregnant: false
  }
};

/* ==========================================================================
   Initialization
   ========================================================================== */

function init() {
  setupEventListeners();
  updateApiStatusUI();
  initTheme();
  updateHistoryBadge();
  restoreFormDraft();
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

function setupEventListeners() {
  // Hemoglobin input mode
  radioHbCalculated.addEventListener('change', () => {
    setHemoglobinMode();
    triggerDraftSave();
  });
  radioHbDirect.addEventListener('change', () => {
    setHemoglobinMode();
    triggerDraftSave();
  });

  // Live Hemoglobin calculation/input preview & draft autosave
  inputHbAbs.addEventListener('input', () => {
    updateHemoglobinPreview();
    triggerDraftSave();
  });
  inputHbFactor.addEventListener('input', () => {
    updateHemoglobinPreview();
    triggerDraftSave();
  });
  inputHbDirect.addEventListener('input', () => {
    updateHemoglobinPreview();
    triggerDraftSave();
  });

  // Live RBC Count conversion as user types & draft autosave
  inputRbcCount.addEventListener('input', () => {
    updateRbcConversionPreview();
    triggerDraftSave();
  });

  // Demographics change & draft autosave
  inputAge.addEventListener('input', triggerDraftSave);
  radioSexMale.addEventListener('change', () => {
    handleSexChange();
    triggerDraftSave();
  });
  radioSexFemale.addEventListener('change', () => {
    handleSexChange();
    triggerDraftSave();
  });
  checkPregnancy.addEventListener('change', triggerDraftSave);

  // Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    performCalculation(true);
  });

  // Quick AI button in form
  btnQuickAi.addEventListener('click', () => {
    if (!currentCalculation) {
      if (form.checkValidity()) {
        performCalculation(true);
      } else {
        form.reportValidity();
        return;
      }
    }
    triggerAIAnalysis();
  });

  // AI trigger button inside AI card
  btnTriggerAi.addEventListener('click', () => {
    if (!currentCalculation) {
      showToast('กรุณากรอกข้อมูลและคำนวณผลเลือดก่อนส่งให้ AI วิเคราะห์', 'info');
      return;
    }
    triggerAIAnalysis();
  });

  // Reset form
  btnReset.addEventListener('click', resetForm);

  // Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      loadPreset(presetKey);
    });
  });

  // API Modal
  btnOpenApiModal.addEventListener('click', openApiModal);
  btnCloseApiModal.addEventListener('click', closeApiModal);
  btnCancelApiModal.addEventListener('click', closeApiModal);
  btnSaveApiKey.addEventListener('click', saveApiModalConfig);
  btnClearApiKey.addEventListener('click', clearApiKey);
  btnToggleKeyVisibility.addEventListener('click', toggleKeyVisibility);

  // Formula Modal
  btnFormulaInfo.addEventListener('click', () => formulaModal.classList.add('active'));
  btnCloseFormula.addEventListener('click', () => formulaModal.classList.remove('active'));
  btnOkFormula.addEventListener('click', () => formulaModal.classList.remove('active'));

  // Quota Warning Modal
  if (btnCloseQuotaModal) btnCloseQuotaModal.addEventListener('click', closeQuotaModal);
  if (btnDismissQuota) btnDismissQuota.addEventListener('click', closeQuotaModal);
  if (btnQuotaUseOffline) {
    btnQuotaUseOffline.addEventListener('click', () => {
      closeQuotaModal();
      if (currentCalculation) {
        showToast('สลับใช้บทวิเคราะห์ผู้เชี่ยวชาญโลหิตวิทยา (Offline Expert)', 'info');
        renderOfflineAnalysisDirectly();
      }
    });
  }
  if (btnQuotaTryLite) {
    btnQuotaTryLite.addEventListener('click', () => {
      closeQuotaModal();
      saveStoredModel('gemini-3.5-flash-lite');
      updateApiStatusUI();
      showToast('เปลี่ยนเป็น Gemini 3.5 Flash Lite แล้ว กำลังลองวิเคราะห์ใหม่...', 'info');
      triggerAIAnalysis();
    });
  }
  if (btnQuotaOpenKeyModal) {
    btnQuotaOpenKeyModal.addEventListener('click', () => {
      closeQuotaModal();
      openApiModal();
    });
  }

  // History Modal
  if (btnOpenHistory) btnOpenHistory.addEventListener('click', openHistoryModal);
  if (btnCloseHistoryModal) btnCloseHistoryModal.addEventListener('click', closeHistoryModal);
  if (btnCloseHistoryFooter) btnCloseHistoryFooter.addEventListener('click', closeHistoryModal);
  if (btnExportHistory) btnExportHistory.addEventListener('click', exportHistoryAsJSON);
  if (btnClearAllHistory) {
    btnClearAllHistory.addEventListener('click', () => {
      if (confirm('คุณต้องการลบประวัติการคำนวณทั้งหมดออกจากเครื่องใช่หรือไม่?')) {
        clearAllHistory();
        renderHistoryList();
        updateHistoryBadge();
        showToast('ลบประวัติทั้งหมดเรียบร้อยแล้ว', 'info');
      }
    });
  }

  // Theme Toggle
  btnThemeToggle.addEventListener('click', toggleTheme);

  // Copy & Print
  btnCopyReport.addEventListener('click', copyReportToClipboard);
  if (btnPrintReport) btnPrintReport.addEventListener('click', () => window.print());

  // Close modals on clicking outside dialog
  window.addEventListener('click', (e) => {
    if (e.target === apiModal) closeApiModal();
    if (e.target === formulaModal) formulaModal.classList.remove('active');
    if (e.target === quotaModal) closeQuotaModal();
    if (e.target === historyModal) closeHistoryModal();
  });
}

/* ==========================================================================
   Draft Autosave & Restore
   ========================================================================== */

let draftTimer = null;
function triggerDraftSave() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    const isDirect = radioHbDirect.checked;
    saveFormDraft({
      hbMode: isDirect ? 'direct' : 'calculated',
      hbAbs: inputHbAbs.value,
      hbFactor: inputHbFactor.value,
      hbDirect: inputHbDirect.value,
      hct: inputHct.value,
      rbcRawCount: inputRbcCount.value,
      age: inputAge.value,
      sex: radioSexFemale.checked ? 'female' : 'male',
      isPregnant: checkPregnancy.checked
    });
  }, 400);
}

function restoreFormDraft() {
  const draft = loadFormDraft();
  if (!draft) return;

  if (draft.hbMode === 'direct') {
    radioHbDirect.checked = true;
    radioHbCalculated.checked = false;
  } else {
    radioHbCalculated.checked = true;
    radioHbDirect.checked = false;
  }

  if (draft.hbAbs !== undefined) inputHbAbs.value = draft.hbAbs;
  if (draft.hbFactor !== undefined) inputHbFactor.value = draft.hbFactor;
  if (draft.hbDirect !== undefined) inputHbDirect.value = draft.hbDirect;
  if (draft.hct !== undefined) inputHct.value = draft.hct;
  if (draft.rbcRawCount !== undefined) inputRbcCount.value = draft.rbcRawCount;
  if (draft.age !== undefined) inputAge.value = draft.age;

  if (draft.sex === 'female') {
    radioSexFemale.checked = true;
    radioSexMale.checked = false;
  } else {
    radioSexMale.checked = true;
    radioSexFemale.checked = false;
  }

  checkPregnancy.checked = Boolean(draft.isPregnant);

  setHemoglobinMode();
  handleSexChange();
  updateHemoglobinPreview();
  updateRbcConversionPreview();
}

/* ==========================================================================
   UI Helpers & Handlers
   ========================================================================== */

function updateRbcConversionPreview() {
  const raw = parseFloat(inputRbcCount.value);
  if (!isNaN(raw) && raw > 0) {
    const converted = raw / 100;
    convertedRbcVal.textContent = converted.toFixed(2);
  } else {
    convertedRbcVal.textContent = '0.00';
  }
}

function updateHemoglobinPreview() {
  const hb = getHemoglobinValues().hb;

  calculatedHbValue.textContent = Number.isFinite(hb) && hb > 0
    ? hb.toFixed(1)
    : '0.0';
}

function setHemoglobinMode() {
  const isDirect = radioHbDirect.checked;

  hbCalculatedInputs.hidden = isDirect;
  hbDirectInput.hidden = !isDirect;

  inputHbAbs.disabled = isDirect;
  inputHbFactor.disabled = isDirect;
  inputHbAbs.required = !isDirect;
  inputHbFactor.required = !isDirect;

  inputHbDirect.disabled = !isDirect;
  inputHbDirect.required = isDirect;

  hbInputHint.textContent = isDirect
    ? 'ระบบจะใช้ค่า Hemoglobin ที่กรอกโดยตรงในสูตรคำนวณ'
    : 'ระบบจะคำนวณ Hb จาก Abs × Factor แล้วนำค่า Hb ไปใช้ในสูตรเดิม';

  updateHemoglobinPreview();
}

function getHemoglobinValues() {
  if (radioHbDirect.checked) {
    const hb = parseFloat(inputHbDirect.value);
    return { hb, hbAbs: null, hbFactor: null, hbMode: 'direct' };
  }

  const hbAbs = parseFloat(inputHbAbs.value);
  const hbFactor = parseFloat(inputHbFactor.value);
  return { hb: hbAbs * hbFactor, hbAbs, hbFactor, hbMode: 'calculated' };
}

function handleSexChange() {
  const isFemale = radioSexFemale.checked;
  if (isFemale) {
    pregnancyContainer.style.display = 'block';
  } else {
    pregnancyContainer.style.display = 'none';
    checkPregnancy.checked = false;
  }
}

function loadPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return;

  radioHbCalculated.checked = true;
  radioHbDirect.checked = false;
  setHemoglobinMode();
  inputHbAbs.value = preset.hb;
  inputHbFactor.value = 1;
  inputHct.value = preset.hct;
  inputRbcCount.value = preset.rbcCount;
  inputAge.value = preset.age;

  if (preset.sex === 'female') {
    radioSexFemale.checked = true;
    radioSexMale.checked = false;
  } else {
    radioSexMale.checked = true;
    radioSexFemale.checked = false;
  }

  handleSexChange();
  checkPregnancy.checked = Boolean(preset.isPregnant);
  updateHemoglobinPreview();
  updateRbcConversionPreview();
  triggerDraftSave();

  showToast(`โหลดเคสตัวอย่าง: ${preset.name}`, 'info');

  // Automatically calculate and record
  performCalculation(true);
}

function resetForm() {
  form.reset();
  radioSexMale.checked = true;
  radioHbCalculated.checked = true;
  radioHbDirect.checked = false;
  setHemoglobinMode();
  handleSexChange();
  updateRbcConversionPreview();
  clearFormDraft();
  currentCalculation = null;
  currentCalculationId = null;

  emptyStateView.style.display = 'block';
  activeResultsView.style.display = 'none';
  resultToolbar.style.display = 'none';
  patientSummaryBadge.textContent = 'รอการกรอกข้อมูลเพื่อคำนวณ...';

  aiPlaceholderView.style.display = 'block';
  aiLoadingView.style.display = 'none';
  aiMarkdownOutput.style.display = 'none';
  aiMarkdownOutput.innerHTML = '';

  showToast('ล้างข้อมูลเรียบร้อย', 'info');
}

/* ==========================================================================
   Calculation & Results Rendering
   ========================================================================== */

function performCalculation(saveHistory = true) {
  const { hb, hbAbs, hbFactor, hbMode } = getHemoglobinValues();
  const hct = inputHct.value;
  const rbcRawCount = inputRbcCount.value;
  const age = inputAge.value;
  const sex = radioSexFemale.checked ? 'female' : 'male';
  const isPregnant = sex === 'female' && checkPregnancy.checked;

  try {
    const result = calculateRBCIndices({
      hb,
      hbAbs,
      hbFactor,
      hbMode,
      hct,
      rbcRawCount,
      age,
      sex,
      isPregnant
    });

    currentCalculation = result;
    renderResults(result);

    if (saveHistory) {
      const saved = saveCalculationToHistory(result);
      if (saved) {
        currentCalculationId = saved.id;
        updateHistoryBadge();
      }
    }

    // Scroll slightly to results if on mobile
    if (window.innerWidth <= 1080) {
      document.getElementById('results-card').scrollIntoView({ behavior: 'smooth' });
    }

    showToast('คำนวณและแปลผลดัชนีเม็ดเลือดสำเร็จ', 'success');
  } catch (err) {
    showToast(err.message || 'เกิดข้อผิดพลาดในการคำนวณ', 'error');
  }
}

function calculateGaugePosition(value, min, max) {
  const spread = max - min;
  const lowerBound = min - spread * 0.45;
  const upperBound = max + spread * 0.45;

  let pct = ((value - lowerBound) / (upperBound - lowerBound)) * 100;
  if (pct < 5) pct = 5;
  if (pct > 95) pct = 95;
  return pct;
}

function renderResults(data) {
  const { inputs, indices, demoRef, evaluations, morphology } = data;

  // 1. Patient Summary Badge
  const sexLabel = inputs.sex === 'female' 
    ? (inputs.isPregnant ? 'หญิง (ตั้งครรภ์ 🤰)' : 'หญิง')
    : 'ชาย';
  patientSummaryBadge.textContent = `ผู้ป่วย: เพศ${sexLabel} | อายุ ${inputs.age} ปี | กลุ่มอ้างอิง: ${demoRef.groupLabel}`;

  // 2. Table Rows
  const tableRows = [
    {
      name: 'Hemoglobin (Hb)',
      sub: inputs.hbMode === 'direct'
        ? 'กรอกค่า Hemoglobin โดยตรง'
        : `คำนวณจาก Abs (${inputs.hbAbs}) × Factor (${inputs.hbFactor})`,
      value: inputs.hb.toFixed(1),
      unit: 'g/dL',
      ref: `${demoRef.hb.min} - ${demoRef.hb.max} g/dL`,
      status: evaluations.hb,
      gaugePct: calculateGaugePosition(inputs.hb, demoRef.hb.min, demoRef.hb.max)
    },
    {
      name: 'Hematocrit (Hct)',
      sub: 'ปริมาตรเม็ดเลือดแดงอัดแน่น',
      value: inputs.hct.toFixed(1),
      unit: '%',
      ref: `${demoRef.hct.min} - ${demoRef.hct.max} %`,
      status: evaluations.hct,
      gaugePct: calculateGaugePosition(inputs.hct, demoRef.hct.min, demoRef.hct.max)
    },
    {
      name: 'RBC Count',
      sub: `นับได้ ${inputs.rbcRawCount} cells/5 ช่อง (Dilute 1:200)`,
      value: inputs.rbcConverted.toFixed(2),
      unit: '× 10⁶/µL',
      ref: `${demoRef.rbc.min} - ${demoRef.rbc.max} × 10⁶/µL`,
      status: evaluations.rbc,
      gaugePct: calculateGaugePosition(inputs.rbcConverted, demoRef.rbc.min, demoRef.rbc.max)
    },
    {
      name: 'MCV (Mean Corpuscular Volume)',
      sub: 'ปริมาตรเฉลี่ยของเม็ดเลือดแดง: (Hct × 10) ÷ RBC',
      value: indices.mcv.toFixed(1),
      unit: 'fL',
      ref: '80.0 - 100.0 fL',
      status: evaluations.mcv,
      gaugePct: calculateGaugePosition(indices.mcv, 80.0, 100.0)
    },
    {
      name: 'MCH (Mean Corpuscular Hemoglobin)',
      sub: 'น้ำหนักฮีโมโกลบินเฉลี่ยในเซลล์: (Hb × 10) ÷ RBC',
      value: indices.mch.toFixed(1),
      unit: 'pg',
      ref: '27.0 - 31.0 pg',
      status: evaluations.mch,
      gaugePct: calculateGaugePosition(indices.mch, 27.0, 31.0)
    },
    {
      name: 'MCHC (Mean Corpuscular Hb Concentration)',
      sub: 'ความเข้มข้นเฉลี่ยของฮีโมโกลบิน: (Hb × 100) ÷ Hct',
      value: indices.mchc.toFixed(1),
      unit: 'g/dL',
      ref: '32.0 - 36.0 g/dL',
      status: evaluations.mchc,
      gaugePct: calculateGaugePosition(indices.mchc, 32.0, 36.0)
    }
  ];

  indicesTableBody.innerHTML = tableRows.map(row => {
    let statusClass = 'normal';
    let statusIcon = '✓';
    if (row.status.status === 'low') {
      statusClass = 'low';
      statusIcon = '▼';
    } else if (row.status.status === 'high') {
      statusClass = 'high';
      statusIcon = '▲';
    }

    return `
      <tr>
        <td>
          <div class="param-name">
            <span>${row.name}</span>
            <span class="param-sub">${row.sub}</span>
          </div>
        </td>
        <td>
          <span class="param-value">${row.value}</span>
          <span class="param-unit">${row.unit}</span>
        </td>
        <td>
          <span class="param-ref">${row.ref}</span>
        </td>
        <td>
          <span class="status-pill ${statusClass}">
            <span>${statusIcon}</span>
            <span>${row.status.labelTh}</span>
          </span>
        </td>
        <td>
          <div class="gauge-track" title="ค่าปัจจุบัน: ${row.value} (${row.status.labelEn})">
            <div class="gauge-zone low"></div>
            <div class="gauge-zone normal"></div>
            <div class="gauge-zone high"></div>
            <div class="gauge-indicator" style="left: ${row.gaugePct}%;"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // 3. Morphology & Mentzer
  morphSizeVal.textContent = morphology.sizeCategoryTh;
  morphChromicVal.textContent = morphology.chromicCategoryTh;
  morphDiagnosisPill.textContent = morphology.morphologyLabelTh;

  mentzerVal.textContent = indices.mentzerIndex.toFixed(1);
  mentzerDesc.textContent = morphology.mentzerTh;

  // 4. Toggle UI views
  emptyStateView.style.display = 'none';
  activeResultsView.style.display = 'block';
  resultToolbar.style.display = 'flex';
}

/* ==========================================================================
   Gemini AI Consultation
   ========================================================================== */

async function triggerAIAnalysis() {
  if (!currentCalculation) return;

  const apiKey = getStoredApiKey();
  const model = getStoredModel();

  // Show loading state
  aiPlaceholderView.style.display = 'none';
  aiMarkdownOutput.style.display = 'none';
  aiLoadingView.style.display = 'block';
  btnTriggerAi.disabled = true;

  try {
    let markdownResponse = '';

    try {
      const result = await consultGeminiAPI(currentCalculation, apiKey, model);
      markdownResponse = result.text;
      const sourceLabel = result.source === 'custom_key' ? 'คีย์ส่วนตัว' : 'ระบบกลาง Vercel';
      showToast(`รับบทวิเคราะห์จาก Gemini API (${sourceLabel}) สำเร็จ`, 'success');
    } catch (apiErr) {
      console.warn('Gemini API call failed:', apiErr);

      if (apiErr.isQuotaExceeded) {
        openQuotaModal();
        showToast('โควต้า Gemini API กลางหมดชั่วคราว (Quota Exceeded)', 'error');
        markdownResponse = generateOfflineExpertAnalysis(currentCalculation);
      } else {
        showToast(`Gemini API: ${apiErr.message} (สลับใช้บทวิเคราะห์ผู้เชี่ยวชาญ)`, 'error');
        markdownResponse = generateOfflineExpertAnalysis(currentCalculation);
      }
    }

    // Render Markdown
    aiMarkdownOutput.innerHTML = marked.parse(markdownResponse);
    aiLoadingView.style.display = 'none';
    aiMarkdownOutput.style.display = 'block';

    // Update history record if one exists
    if (currentCalculationId) {
      updateHistoryAiAnalysis(currentCalculationId, markdownResponse);
    }

    // Scroll into view
    aiMarkdownOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    aiLoadingView.style.display = 'none';
    aiPlaceholderView.style.display = 'block';
    showToast(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์', 'error');
  } finally {
    btnTriggerAi.disabled = false;
  }
}

function renderOfflineAnalysisDirectly() {
  if (!currentCalculation) return;

  const markdownResponse = generateOfflineExpertAnalysis(currentCalculation);
  aiPlaceholderView.style.display = 'none';
  aiLoadingView.style.display = 'none';
  aiMarkdownOutput.innerHTML = marked.parse(markdownResponse);
  aiMarkdownOutput.style.display = 'block';

  if (currentCalculationId) {
    updateHistoryAiAnalysis(currentCalculationId, markdownResponse);
  }

  aiMarkdownOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ==========================================================================
   Quota Warning Modal
   ========================================================================== */

function openQuotaModal() {
  if (quotaModal) quotaModal.classList.add('active');
}

function closeQuotaModal() {
  if (quotaModal) quotaModal.classList.remove('active');
}

/* ==========================================================================
   History Modal & Management
   ========================================================================== */

function updateHistoryBadge() {
  const history = getCalculationHistory();
  if (historyBadge) {
    historyBadge.textContent = history.length;
    historyBadge.style.display = history.length > 0 ? 'inline-flex' : 'none';
  }
}

function openHistoryModal() {
  renderHistoryList();
  if (historyModal) historyModal.classList.add('active');
}

function closeHistoryModal() {
  if (historyModal) historyModal.classList.remove('active');
}

function renderHistoryList() {
  const history = getCalculationHistory();
  if (historyTotalLabel) {
    historyTotalLabel.textContent = `พบประวัติ ${history.length} รายการ`;
  }

  if (!historyListContainer) return;

  if (history.length === 0) {
    historyListContainer.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">📂</div>
        <p><strong>ยังไม่มีประวัติการคำนวณ</strong></p>
        <span class="history-empty-hint">เมื่อคุณกด "คำนวณและแปลผล" ระบบจะบันทึกข้อมูลผลเลือดไว้ที่นี่อัตโนมัติ</span>
      </div>
    `;
    return;
  }

  historyListContainer.innerHTML = history.map(item => {
    const { inputs, indices, morphology, displayDate, id, aiAnalysis } = item;
    const sexText = inputs.sex === 'female' 
      ? (inputs.isPregnant ? 'หญิง (ตั้งครรภ์)' : 'หญิง')
      : 'ชาย';

    const hbModeText = inputs.hbMode === 'direct' ? 'กรอกตรง' : 'Abs×Factor';

    return `
      <div class="history-card" data-id="${id}">
        <div class="history-card-header">
          <div class="history-time">
            <span>📅 ${displayDate || 'ไม่ระบุวัน'}</span>
          </div>
          <span class="history-patient-pill">เพศ${sexText} | อายุ ${inputs.age} ปี (${hbModeText})</span>
        </div>

        <div class="history-grid-values">
          <div class="history-val-item">
            <span class="history-val-label">Hb</span>
            <span class="history-val-number">${inputs.hb ? Number(inputs.hb).toFixed(1) : '-'}</span>
          </div>
          <div class="history-val-item">
            <span class="history-val-label">Hct</span>
            <span class="history-val-number">${inputs.hct ? Number(inputs.hct).toFixed(1) : '-'}%</span>
          </div>
          <div class="history-val-item">
            <span class="history-val-label">RBC</span>
            <span class="history-val-number">${inputs.rbcConverted ? Number(inputs.rbcConverted).toFixed(2) : '-'}</span>
          </div>
          <div class="history-val-item">
            <span class="history-val-label">MCV</span>
            <span class="history-val-number">${indices.mcv ? Number(indices.mcv).toFixed(1) : '-'}</span>
          </div>
          <div class="history-val-item">
            <span class="history-val-label">MCH</span>
            <span class="history-val-number">${indices.mch ? Number(indices.mch).toFixed(1) : '-'}</span>
          </div>
          <div class="history-val-item">
            <span class="history-val-label">MCHC</span>
            <span class="history-val-number">${indices.mchc ? Number(indices.mchc).toFixed(1) : '-'}</span>
          </div>
        </div>

        <div class="history-tags-row">
          <span class="history-tag">${morphology.morphologyLabelTh || 'ประเมินสัณฐาน'}</span>
          <span class="history-tag mentzer">Mentzer: ${indices.mentzerIndex ? Number(indices.mentzerIndex).toFixed(1) : '-'}</span>
          ${aiAnalysis ? '<span class="history-tag ai-done">✨ มีบทวิเคราะห์ AI</span>' : ''}
        </div>

        <div class="history-card-actions">
          <button type="button" class="btn-sm btn-ghost btn-restore-history" data-id="${id}" title="โหลดข้อมูลกลับเข้าฟอร์ม">
            🔄 โหลดข้อมูล
          </button>
          <button type="button" class="btn-sm btn-ghost btn-copy-history" data-id="${id}" title="คัดลอกสรุปผลการตรวจนี้">
            📋 คัดลอก
          </button>
          <button type="button" class="btn-sm btn-danger-outline btn-delete-history" data-id="${id}" title="ลบรายการนี้">
            🗑️ ลบ
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach card event listeners
  historyListContainer.querySelectorAll('.btn-restore-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      restoreHistoryRecord(id);
    });
  });

  historyListContainer.querySelectorAll('.btn-copy-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      copyHistoryRecord(id);
    });
  });

  historyListContainer.querySelectorAll('.btn-delete-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      deleteHistoryItem(id);
      renderHistoryList();
      updateHistoryBadge();
      showToast('ลบรายการออกจากประวัติเรียบร้อย', 'info');
    });
  });
}

function restoreHistoryRecord(id) {
  const history = getCalculationHistory();
  const record = history.find(item => item.id === id);
  if (!record || !record.inputs) return;

  const { inputs } = record;

  if (inputs.hbMode === 'direct') {
    radioHbDirect.checked = true;
    radioHbCalculated.checked = false;
    inputHbDirect.value = inputs.hb;
  } else {
    radioHbCalculated.checked = true;
    radioHbDirect.checked = false;
    inputHbAbs.value = inputs.hbAbs || inputs.hb;
    inputHbFactor.value = inputs.hbFactor || 1;
  }

  inputHct.value = inputs.hct;
  inputRbcCount.value = inputs.rbcRawCount;
  inputAge.value = inputs.age;

  if (inputs.sex === 'female') {
    radioSexFemale.checked = true;
    radioSexMale.checked = false;
  } else {
    radioSexMale.checked = true;
    radioSexFemale.checked = false;
  }

  checkPregnancy.checked = Boolean(inputs.isPregnant);

  setHemoglobinMode();
  handleSexChange();
  updateHemoglobinPreview();
  updateRbcConversionPreview();
  triggerDraftSave();

  // Perform calculation without duplicate new history entry
  performCalculation(false);
  currentCalculationId = record.id;

  // Restore AI Markdown analysis if it exists
  if (record.aiAnalysis) {
    aiPlaceholderView.style.display = 'none';
    aiLoadingView.style.display = 'none';
    aiMarkdownOutput.innerHTML = marked.parse(record.aiAnalysis);
    aiMarkdownOutput.style.display = 'block';
  } else {
    aiPlaceholderView.style.display = 'block';
    aiLoadingView.style.display = 'none';
    aiMarkdownOutput.style.display = 'none';
    aiMarkdownOutput.innerHTML = '';
  }

  closeHistoryModal();
  showToast('โหลดข้อมูลประวัติผลเลือดเรียบร้อย', 'success');
}

function copyHistoryRecord(id) {
  const history = getCalculationHistory();
  const item = history.find(r => r.id === id);
  if (!item) return;

  const { inputs, indices, demoRef, evaluations, morphology } = item;
  const reportText = `📋 ประวัติผลการตรวจและคำนวณดัชนีเม็ดเลือดแดง (HemaCalc AI)
-------------------------------------------------------
วันที่บันทึก: ${item.displayDate}
ข้อมูลผู้ป่วย: เพศ${inputs.sex === 'female' ? 'หญิง' + (inputs.isPregnant ? ' (ตั้งครรภ์)' : '') : 'ชาย'} | อายุ ${inputs.age} ปี
กลุ่มอ้างอิง: ${demoRef.groupLabel}

ผลตรวจทางห้องปฏิบัติการ:
- Hemoglobin (Hb): ${inputs.hb} g/dL [${evaluations.hb.labelTh}]
- Hematocrit (Hct): ${inputs.hct} % [${evaluations.hct.labelTh}]
- RBC Count: ${inputs.rbcConverted} x 10⁶/µL [${evaluations.rbc.labelTh}]

ดัชนีเม็ดเลือดแดง (RBC Indices):
- MCV: ${indices.mcv} fL [${evaluations.mcv.labelTh}]
- MCH: ${indices.mch} pg [${evaluations.mch.labelTh}]
- MCHC: ${indices.mchc} g/dL [${evaluations.mchc.labelTh}]
- Mentzer Index: ${indices.mentzerIndex}

การแปลผล:
- สรุปสัณฐาน: ${morphology.morphologyLabelTh}
- Mentzer Index: ${morphology.mentzerTh}`;

  navigator.clipboard.writeText(reportText).then(() => {
    showToast('คัดลอกสรุปผลการตรวจเรียบร้อย', 'success');
  }).catch(() => {
    showToast('ไม่สามารถคัดลอกได้ กรุณาลองใหม่', 'error');
  });
}

/* ==========================================================================
   API Key Management Modal
   ========================================================================== */

function openApiModal() {
  modalInputApiKey.value = getStoredApiKey();
  modalSelectModel.value = getStoredModel();
  modalInputApiKey.type = 'password';
  btnToggleKeyVisibility.textContent = '👁️';
  apiModal.classList.add('active');
}

function closeApiModal() {
  apiModal.classList.remove('active');
}

function saveApiModalConfig() {
  const key = modalInputApiKey.value.trim();
  const model = modalSelectModel.value;

  saveStoredApiKey(key);
  saveStoredModel(model);
  updateApiStatusUI();
  closeApiModal();

  showToast(key ? 'บันทึก Gemini API Key ส่วนตัวสำเร็จ' : 'ใช้ Gemini API ระบบกลาง (Vercel)', 'success');
}

function clearApiKey() {
  saveStoredApiKey('');
  modalInputApiKey.value = '';
  updateApiStatusUI();
  closeApiModal();
  showToast('ลบ API Key ส่วนตัวแล้ว (สลับกลับไปใช้ API กลาง)', 'info');
}

function toggleKeyVisibility() {
  if (modalInputApiKey.type === 'password') {
    modalInputApiKey.type = 'text';
    btnToggleKeyVisibility.textContent = '🙈';
  } else {
    modalInputApiKey.type = 'password';
    btnToggleKeyVisibility.textContent = '👁️';
  }
}

function updateApiStatusUI() {
  const key = getStoredApiKey();
  const model = getStoredModel();
  const foundModel = AVAILABLE_MODELS.find(m => m.id === model);
  const modelLabel = foundModel ? foundModel.name.split(' (')[0] : model;

  if (key) {
    apiStatusDot.classList.add('connected');
    apiStatusText.textContent = 'Gemini API: คีย์ส่วนตัว';
    activeModelBadge.textContent = modelLabel;
  } else {
    apiStatusDot.classList.add('connected');
    apiStatusText.textContent = 'Gemini API: ระบบกลาง (Vercel)';
    activeModelBadge.textContent = `${modelLabel} (ระบบกลาง)`;
  }
}

/* ==========================================================================
   Theme & Utilities
   ========================================================================== */

function initTheme() {
  const savedTheme = localStorage.getItem('hemacalc_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('theme-light');
    themeIcon.textContent = '☀️';
  } else {
    document.body.classList.remove('theme-light');
    themeIcon.textContent = '🌙';
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('theme-light');
  localStorage.setItem('hemacalc_theme', isLight ? 'light' : 'dark');
  themeIcon.textContent = isLight ? '☀️' : '🌙';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

function copyReportToClipboard() {
  if (!currentCalculation) return;

  const { inputs, indices, demoRef, evaluations, morphology } = currentCalculation;
  const reportText = `📋 สรุปผลการตรวจและคำนวณดัชนีเม็ดเลือดแดง (HemaCalc AI Report)
-------------------------------------------------------
ข้อมูลผู้ป่วย: เพศ${inputs.sex === 'female' ? 'หญิง' + (inputs.isPregnant ? ' (ตั้งครรภ์)' : '') : 'ชาย'} | อายุ ${inputs.age} ปี
กลุ่มอ้างอิง: ${demoRef.groupLabel}

ผลการตรวจทางห้องปฏิบัติการ:
- Hemoglobin (Hb): ${inputs.hb} g/dL (${inputs.hbMode === 'direct' ? 'กรอกโดยตรง' : `Abs ${inputs.hbAbs} × Factor ${inputs.hbFactor}`}) [${evaluations.hb.labelTh}] (เกณฑ์: ${demoRef.hb.min}-${demoRef.hb.max})
- Hematocrit (Hct): ${inputs.hct} % [${evaluations.hct.labelTh}] (เกณฑ์: ${demoRef.hct.min}-${demoRef.hct.max})
- RBC Count (1:200 ใน 5 ช่อง): ${inputs.rbcRawCount} cells/5 ช่อง
- RBC Count (แปลงหน่วย): ${inputs.rbcConverted} x 10⁶/µL [${evaluations.rbc.labelTh}] (เกณฑ์: ${demoRef.rbc.min}-${demoRef.rbc.max})

ดัชนีเม็ดเลือดแดง (RBC Indices):
- MCV: ${indices.mcv} fL [${evaluations.mcv.labelTh}] (เกณฑ์ปกติ: 80 - 100 fL)
- MCH: ${indices.mch} pg [${evaluations.mch.labelTh}] (เกณฑ์ปกติ: 27 - 31 pg)
- MCHC: ${indices.mchc} g/dL [${evaluations.mchc.labelTh}] (เกณฑ์ปกติ: 32 - 36 g/dL)
- Mentzer Index (MCV/RBC): ${indices.mentzerIndex}

การแปลผลทางสัณฐานวิทยา:
- สรุป: ${morphology.morphologyLabelTh}
- Mentzer: ${morphology.mentzerTh}

* หมายเหตุ: รายงานนี้จัดทำขึ้นเพื่อการศึกษาและการคำนวณเบื้องต้นเท่านั้น ไม่สามารถใช้แทนการวินิจฉัยทางการแพทย์ได้`;

  navigator.clipboard.writeText(reportText).then(() => {
    showToast('คัดลอกสรุปผลการตรวจไปยังคลิปบอร์ดแล้ว', 'success');
  }).catch(() => {
    showToast('ไม่สามารถคัดลอกได้ กรุณาลองใหม่', 'error');
  });
}

// Start application
document.addEventListener('DOMContentLoaded', init);
