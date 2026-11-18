/**
 * Reference Ranges & Hematology Calculation Engine
 * 
 * Contains demographic-adjusted reference ranges for:
 * - Hemoglobin (Hb) [g/dL]
 * - Hematocrit (Hct) [%]
 * - Red Blood Cell count (RBC) [10^6/µL]
 * 
 * Standard RBC Indices reference ranges:
 * - MCV: 80.0 - 96.0 fL
 * - MCH: 27.5 - 33.2 pg
 * - MCHC: 33.4 - 35.5 g/dL
 */

export const INDICES_REFERENCE = {
  mcv: {
    min: 80.0,
    max: 96.0,
    unit: 'fL',
    nameTh: 'ปริมาตรเฉลี่ยของเม็ดเลือดแดง (MCV)',
    nameEn: 'Mean Corpuscular Volume',
    formula: '(Hct × 10) / RBC'
  },
  mch: {
    min: 27.5,
    max: 33.2,
    unit: 'pg',
    nameTh: 'ปริมาณฮีโมโกลบินเฉลี่ยในเม็ดเลือดแดง (MCH)',
    nameEn: 'Mean Corpuscular Hemoglobin',
    formula: '(Hb × 10) / RBC'
  },
  mchc: {
    min: 33.4,
    max: 35.5,
    unit: 'g/dL',
    nameTh: 'ความเข้มข้นเฉลี่ยของฮีโมโกลบินในเม็ดเลือดแดง (MCHC)',
    nameEn: 'Mean Corpuscular Hemoglobin Concentration',
    formula: '(Hb × 100) / Hct'
  }
};

// Pediatric reference database. Age is supplied in years; day-based ranges
// are converted to years so infants can be entered as decimals (for example,
// 7 days ≈ 0.02 years).
const PEDIATRIC_REFERENCE_ROWS = [
  {
    minAge: 0,
    maxAge: 15 / 365,
    ageLabel: '0 - 14 วัน',
    male: [4.10, 5.55, 13.9, 19.1, 39.8, 53.6, 91.3, 103.1, 31.3, 35.6, 33.0, 35.7],
    female: [4.12, 5.74, 13.4, 20.0, 39.6, 57.2, 92.7, 106.4, 31.1, 35.9, 33.4, 35.4]
  },
  {
    minAge: 15 / 365,
    maxAge: 31 / 365,
    ageLabel: '15 - 30 วัน',
    male: [3.16, 4.63, 10.0, 15.3, 30.5, 45.0, 89.4, 99.7, 29.9, 34.1, 32.7, 35.1],
    female: [3.32, 4.80, 10.8, 14.6, 32.0, 44.5, 90.1, 103.0, 30.4, 35.3, 33.2, 35.0]
  },
  {
    minAge: 31 / 365,
    maxAge: 61 / 365,
    ageLabel: '31 - 60 วัน',
    male: [3.02, 4.22, 8.9, 12.7, 26.8, 37.5, 84.3, 94.2, 27.8, 32.0, 32.3, 34.8],
    female: [2.93, 3.87, 9.2, 11.4, 27.7, 35.1, 83.4, 96.4, 28.0, 32.5, 32.5, 34.9]
  },
  {
    minAge: 61 / 365,
    maxAge: 181 / 365,
    ageLabel: '61 - 180 วัน',
    male: [3.43, 4.80, 9.6, 12.4, 28.6, 37.2, 74.1, 87.5, 24.4, 28.9, 31.9, 34.4],
    female: [3.45, 4.75, 9.9, 12.4, 29.5, 37.1, 74.8, 88.3, 24.4, 29.5, 32.1, 34.4]
  },
  {
    minAge: 181 / 365,
    maxAge: 2,
    ageLabel: '0.5 - < 2 ปี',
    male: [4.03, 5.07, 10.1, 12.5, 30.8, 37.8, 69.5, 81.7, 22.7, 27.2, 31.6, 34.4],
    female: [3.97, 5.01, 10.2, 12.7, 30.9, 37.9, 71.3, 82.6, 23.2, 27.5, 31.9, 34.2]
  },
  {
    minAge: 2,
    maxAge: 6,
    ageLabel: '2 - < 6 ปี',
    male: [3.89, 4.97, 10.2, 12.7, 31.0, 37.7, 71.3, 84.0, 23.7, 28.3, 32.0, 34.7],
    female: [3.84, 4.92, 10.2, 12.7, 31.2, 37.8, 72.3, 85.0, 23.7, 28.6, 31.8, 34.6]
  },
  {
    minAge: 6,
    maxAge: 12,
    ageLabel: '6 - 12 ปี',
    male: [3.96, 5.03, 10.7, 13.4, 32.2, 39.8, 74.4, 86.1, 24.8, 29.2, 32.2, 34.9],
    female: [3.90, 4.96, 10.6, 13.2, 32.4, 39.5, 75.9, 87.6, 24.8, 29.5, 31.8, 34.6]
  },
  {
    minAge: 12,
    maxAge: 18,
    ageLabel: '12 - < 18 ปี',
    male: [4.03, 5.29, 11.0, 14.5, 33.9, 43.5, 76.7, 89.2, 25.2, 30.2, 31.8, 34.8],
    female: [3.93, 4.90, 10.8, 13.3, 33.4, 40.4, 76.9, 90.6, 24.8, 30.2, 31.5, 34.2]
  }
];

function createPediatricReference(row, sex) {
  const values = row[sex === 'female' ? 'female' : 'male'];
  return {
    groupLabel: `${sex === 'female' ? 'หญิง' : 'ชาย'} อายุ ${row.ageLabel}`,
    hb: { min: values[2], max: values[3], unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
    hct: { min: values[4], max: values[5], unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
    rbc: { min: values[0], max: values[1], unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
    indices: {
      mcv: { min: values[6], max: values[7], unit: 'fL', nameTh: 'MCV' },
      mch: { min: values[8], max: values[9], unit: 'pg', nameTh: 'MCH' },
      mchc: { min: values[10], max: values[11], unit: 'g/dL', nameTh: 'MCHC' }
    },
    note: `ค่ามาตรฐานดัชนีเม็ดเลือดแดงในเด็ก ช่วงอายุ ${row.ageLabel}`
  };
}

function getPediatricReferenceRanges(age, sex) {
  const row = PEDIATRIC_REFERENCE_ROWS.find(({ minAge, maxAge }) => age >= minAge && age < maxAge);
  return row ? createPediatricReference(row, sex) : null;
}

export function getRbcIndicesReference(age, sex) {
  return getPediatricReferenceRanges(Number(age), sex)?.indices || INDICES_REFERENCE;
}

/**
 * Returns reference range for Hb, Hct, and RBC based on age and sex
 * @param {number} age - Age in years
 * @param {string} sex - 'male' | 'female'
 */
export function getDemographicReferenceRanges(age, sex) {
  const isFemale = sex === 'female';
  const ageNum = Number(age);

  const pediatricReference = getPediatricReferenceRanges(ageNum, sex);
  if (pediatricReference) return pediatricReference;

  // 2. Neonate / Infant (under 2 years)
  if (ageNum < 2) {
    return {
      groupLabel: 'ทารก / เด็กเล็ก (< 2 ปี)',
      hb: { min: 10.5, max: 13.5, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 32.0, max: 40.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 3.70, max: 5.00, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์ปกติสำหรับเด็กเล็ก'
    };
  }

  // 3. Young Children (2 - 5 years)
  if (ageNum <= 5) {
    return {
      groupLabel: 'เด็กปฐมวัย (2 - 5 ปี)',
      hb: { min: 11.0, max: 14.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 33.0, max: 42.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 3.90, max: 5.10, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์มาตรฐานเด็กเล็กตามองค์การอนามัยโลก (WHO)'
    };
  }

  // 4. Children (6 - 11 years)
  if (ageNum <= 11) {
    return {
      groupLabel: 'เด็กวัยเรียน (6 - 11 ปี)',
      hb: { min: 11.5, max: 15.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 35.0, max: 45.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 4.00, max: 5.20, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์มาตรฐานเด็กวัยเรียน'
    };
  }

  // 5. Adolescents (12 - 17 years)
  if (ageNum <= 17) {
    if (isFemale) {
      return {
        groupLabel: 'วัยรุ่นหญิง (12 - 17 ปี)',
        hb: { min: 11.8, max: 15.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
        hct: { min: 35.0, max: 45.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
        rbc: { min: 4.00, max: 5.20, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
        note: 'เกณฑ์มาตรฐานวัยรุ่นหญิง'
      };
    } else {
      return {
        groupLabel: 'วัยรุ่นชาย (12 - 17 ปี)',
        hb: { min: 12.5, max: 16.5, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
        hct: { min: 37.0, max: 49.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
        rbc: { min: 4.30, max: 5.70, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
        note: 'เกณฑ์มาตรฐานวัยรุ่นชาย'
      };
    }
  }

  // 6. Elderly (> 65 years)
  if (ageNum >= 65) {
    if (isFemale) {
      return {
        groupLabel: 'ผู้สูงอายุหญิง (≥ 65 ปี)',
        hb: { min: 11.7, max: 15.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
        hct: { min: 35.0, max: 46.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
        rbc: { min: 3.80, max: 5.10, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
        note: 'เกณฑ์ปรับตามสรีรวิทยาผู้สูงอายุ'
      };
    } else {
      return {
        groupLabel: 'ผู้สูงอายุชาย (≥ 65 ปี)',
        hb: { min: 12.6, max: 17.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
        hct: { min: 38.0, max: 50.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
        rbc: { min: 4.10, max: 5.60, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
        note: 'เกณฑ์ปรับตามสรีรวิทยาผู้สูงอายุ'
      };
    }
  }

  // 7. General Adults (18 - 64 years)
  if (isFemale) {
    return {
      groupLabel: 'หญิงวัยผู้ใหญ่ (Adult Female: 18 - 64 ปี)',
      hb: { min: 12.0, max: 15.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 36.0, max: 45.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 3.90, max: 5.00, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์มาตรฐานผู้ใหญ่หญิง'
    };
  } else {
    return {
      groupLabel: 'ชายวัยผู้ใหญ่ (Adult Male: 18 - 64 ปี)',
      hb: { min: 13.0, max: 17.0, unit: 'g/dL', nameTh: 'ฮีโมโกลบิน (Hb)' },
      hct: { min: 38.0, max: 50.0, unit: '%', nameTh: 'ฮีมาโตคริต (Hct)' },
      rbc: { min: 4.30, max: 5.70, unit: '10⁶/µL', nameTh: 'เม็ดเลือดแดง (RBC Count)' },
      note: 'เกณฑ์มาตรฐานผู้ใหญ่ชาย'
    };
  }
}

/**
 * Evaluates whether a value is Low, Normal, or High
 * @param {number} value 
 * @param {number} min 
 * @param {number} max 
 * @returns {{ status: 'low' | 'normal' | 'high', labelTh: string, labelEn: string }}
 */
export function evaluateStatus(value, min, max) {
  const val = Number(value);
  if (isNaN(val)) return { status: 'unknown', labelTh: 'ไม่ระบุ', labelEn: 'Unknown' };
  
  if (val < min) {
    return { status: 'low', labelTh: 'ต่ำกว่าปกติ (Low)', labelEn: 'Low' };
  } else if (val > max) {
    return { status: 'high', labelTh: 'สูงกว่าปกติ (High)', labelEn: 'High' };
  } else {
    return { status: 'normal', labelTh: 'ปกติ (Normal)', labelEn: 'Normal' };
  }
}

/**
 * Calculates all RBC indices and full diagnostic evaluation
 */
export function calculateRBCIndices({ hb, hbAbs, hbFactor, hbMode, hct, rbcRawCount, age, sex }) {
  const hbVal = parseFloat(hb);
  const hctVal = parseFloat(hct);
  const rbcRawVal = parseFloat(rbcRawCount);
  const ageVal = parseFloat(age);

  if (isNaN(hbVal) || isNaN(hctVal) || isNaN(rbcRawVal) || isNaN(ageVal)) {
    throw new Error('กรุณากรอกข้อมูลตัวเลขให้ครบถ้วนและถูกต้อง');
  }

  if (hbVal <= 0 || hctVal <= 0 || rbcRawVal <= 0 || ageVal < 0) {
    throw new Error('ค่าทางโลหิตวิทยาและอายุต้องเป็นจำนวนบวกที่มากกว่า 0');
  }

  // 1. RBC Count conversion: Count in 5 squares / 100 => 10^6 / µL
  // Standard hemocytometer counting formula: 
  // Cells in 5 small squares (dilution 1:200, depth 0.1mm, volume 0.02 µL)
  // RBC (cells/µL) = (Cells counted × 200) / 0.02 = Cells counted × 10,000
  // RBC (10^6/µL) = (Cells counted × 10,000) / 1,000,000 = Cells counted / 100
  const rbcConverted = rbcRawVal / 100;

  // 2. RBC Indices calculations
  // MCV = (Hct × 10) / RBC
  const mcv = (hctVal * 10) / rbcConverted;

  // MCH = (Hb × 10) / RBC
  const mch = (hbVal * 10) / rbcConverted;

  // MCHC = (Hb × 100) / Hct
  const mchc = (hbVal * 100) / hctVal;

  // Mentzer Index = MCV / RBC
  const mentzerIndex = mcv / rbcConverted;

  // 3. Demographic reference ranges
  const demoRef = getDemographicReferenceRanges(ageVal, sex);
  const indicesRef = getRbcIndicesReference(ageVal, sex);

  // 4. Status evaluations
  const hbStatus = evaluateStatus(hbVal, demoRef.hb.min, demoRef.hb.max);
  const hctStatus = evaluateStatus(hctVal, demoRef.hct.min, demoRef.hct.max);
  const rbcStatus = evaluateStatus(rbcConverted, demoRef.rbc.min, demoRef.rbc.max);

  const mcvStatus = evaluateStatus(mcv, indicesRef.mcv.min, indicesRef.mcv.max);
  const mchStatus = evaluateStatus(mch, indicesRef.mch.min, indicesRef.mch.max);
  const mchcStatus = evaluateStatus(mchc, indicesRef.mchc.min, indicesRef.mchc.max);

  // 5. Morphologic Classification
  let sizeCategory = 'Normocytic';
  let sizeCategoryTh = 'ขนาดปกติ (Normocytic)';
  if (mcv < indicesRef.mcv.min) {
    sizeCategory = 'Microcytic';
    sizeCategoryTh = 'ขนาดเล็กกว่าปกติ (Microcytic)';
  } else if (mcv > indicesRef.mcv.max) {
    sizeCategory = 'Macrocytic';
    sizeCategoryTh = 'ขนาดใหญ่กว่าปกติ (Macrocytic)';
  }

  let chromicCategory = 'Normochromic';
  let chromicCategoryTh = 'ติดสีปกติ (Normochromic)';
  if (mchc < indicesRef.mchc.min || mch < indicesRef.mch.min) {
    chromicCategory = 'Hypochromic';
    chromicCategoryTh = 'ติดสีจาง (Hypochromic)';
  } else if (mchc > indicesRef.mchc.max) {
    chromicCategory = 'Hyperchromic';
    chromicCategoryTh = 'ติดสีเข้มจัด / ผิดปกติ (Hyperchromic/Spherocytes)';
  }

  const isAnemic = hbStatus.status === 'low' || hctStatus.status === 'low';
  let morphologyLabelTh = '';
  let morphologyLabelEn = '';

  if (isAnemic) {
    if (sizeCategory === 'Microcytic' && chromicCategory === 'Hypochromic') {
      morphologyLabelTh = 'ภาวะโลหิตจางชนิดเม็ดเลือดแดงขนาดเล็กติดสีจาง (Microcytic Hypochromic Anemia)';
      morphologyLabelEn = 'Microcytic Hypochromic Anemia';
    } else if (sizeCategory === 'Normocytic' && chromicCategory === 'Normochromic') {
      morphologyLabelTh = 'ภาวะโลหิตจางชนิดเม็ดเลือดแดงขนาดและสีปกติ (Normocytic Normochromic Anemia)';
      morphologyLabelEn = 'Normocytic Normochromic Anemia';
    } else if (sizeCategory === 'Macrocytic') {
      morphologyLabelTh = 'ภาวะโลหิตจางชนิดเม็ดเลือดแดงขนาดใหญ่ (Macrocytic Anemia)';
      morphologyLabelEn = 'Macrocytic Anemia';
    } else {
      morphologyLabelTh = `ภาวะโลหิตจางชนิด ${sizeCategory} ${chromicCategory}`;
      morphologyLabelEn = `${sizeCategory} ${chromicCategory} Anemia`;
    }
  } else {
    if (hbStatus.status === 'high' || hctStatus.status === 'high' || rbcStatus.status === 'high') {
      morphologyLabelTh = 'ภาวะเม็ดเลือดแดงมีความเข้มข้นสูง (Polycythemia / Erythrocytosis)';
      morphologyLabelEn = 'Erythrocytosis / Polycythemia';
    } else {
      morphologyLabelTh = 'ค่าดัชนีเม็ดเลือดแดงอยู่ในเกณฑ์ปกติ (Normal RBC Indices & Morphology)';
      morphologyLabelEn = 'Normal Red Blood Cell Indices';
    }
  }

  // Mentzer Index Interpretation
  let mentzerTh = '';
  if (isAnemic || mcv < indicesRef.mcv.min) {
    if (mentzerIndex < 13.0) {
      mentzerTh = 'Mentzer Index < 13: บ่งชี้ไปทาง "พาหะธาลัสซีเมีย (Thalassemia Trait)" มากกว่าขาดธาตุเหล็ก เนื่องจากจำนวน RBC ยังคงสูงเมื่อเทียบกับ MCV ที่เล็กลง';
    } else {
      mentzerTh = 'Mentzer Index > 13: บ่งชี้ไปทาง "โลหิตจางจากการขาดธาตุเหล็ก (Iron Deficiency Anemia)" มากกว่าพาหะธาลัสซีเมีย เนื่องจากจำนวน RBC ลดลงสัมพันธ์กับขนาดเม็ดเลือด';
    }
  } else {
    mentzerTh = `Mentzer Index = ${mentzerIndex.toFixed(1)} (ปกติไม่มีภาวะโลหิตจาง)`;
  }

  return {
    inputs: {
      hb: hbVal,
      hbAbs: Number(hbAbs),
      hbFactor: Number(hbFactor),
      hbMode: hbMode || 'calculated',
      hct: hctVal,
      rbcRawCount: rbcRawVal,
      rbcConverted: Number(rbcConverted.toFixed(2)),
      age: ageVal,
      sex
    },
    indices: {
      mcv: Number(mcv.toFixed(1)),
      mch: Number(mch.toFixed(1)),
      mchc: Number(mchc.toFixed(1)),
      mentzerIndex: Number(mentzerIndex.toFixed(1))
    },
    demoRef,
    indicesRef,
    evaluations: {
      hb: hbStatus,
      hct: hctStatus,
      rbc: rbcStatus,
      mcv: mcvStatus,
      mch: mchStatus,
      mchc: mchcStatus
    },
    morphology: {
      sizeCategory,
      sizeCategoryTh,
      chromicCategory,
      chromicCategoryTh,
      isAnemic,
      morphologyLabelTh,
      morphologyLabelEn,
      mentzerTh
    }
  };
}
