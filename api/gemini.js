/**
 * Vercel Serverless Function: Gemini API Central Proxy
 * Securely uses GEMINI_API_KEY from Vercel Environment Variables
 */

function buildPrompt(calcData) {
  const { inputs, indices, demoRef, evaluations, morphology } = calcData;

  const pregnancyText = inputs.sex === 'female'
    ? (inputs.isPregnant ? 'ตั้งครรภ์ (Pregnant)' : 'ไม่ได้ตั้งครรภ์ (Not pregnant)')
    : 'ไม่เกี่ยวข้อง (เพศชาย)';

  return `คุณเป็นอายุรแพทย์ผู้เชี่ยวชาญด้านโลหิตวิทยา (Senior Clinical Hematologist) และผู้เชี่ยวชาญด้านเทคนิคการแพทย์ กรุณาช่วยแปลผล วิเคราะห์ดัชนีเม็ดเลือดแดง (RBC Indices) และให้คำแนะนำทางการแพทย์อย่างละเอียด ชัดเจน และเป็นระบบ

### 1. ข้อมูลผู้ป่วย (Demographic Data)
- อายุ: ${inputs.age} ปี
- เพศ: ${inputs.sex === 'female' ? 'หญิง' : 'ชาย'}
- สถานะการตั้งครรภ์: ${pregnancyText}
- กลุ่มอ้างอิง: ${demoRef.groupLabel} (${demoRef.note})

### 2. ผลการตรวจทางห้องปฏิบัติการ (CBC & RBC Indices)
- Hemoglobin (Hb): ${inputs.hb} g/dL (${inputs.hbMode === 'direct' ? 'ผู้ใช้กรอกค่า Hb โดยตรง' : `คำนวณจาก Abs ${inputs.hbAbs} × Factor ${inputs.hbFactor}`}) (ค่าอ้างอิง: ${demoRef.hb.min} - ${demoRef.hb.max} g/dL) -> สถานะ: ${evaluations.hb.labelTh}
- Hematocrit (Hct): ${inputs.hct} % (ค่าอ้างอิง: ${demoRef.hct.min} - ${demoRef.hct.max} %) -> สถานะ: ${evaluations.hct.labelTh}
- RBC Count (Dilute 1:200 ใน 5 ช่องนับ): ${inputs.rbcRawCount} cells/5 squares
- RBC Count (แปลงหน่วยแล้ว): ${inputs.rbcConverted} x 10⁶/µL (ค่าอ้างอิง: ${demoRef.rbc.min} - ${demoRef.rbc.max} x 10⁶/µL) -> สถานะ: ${evaluations.rbc.labelTh}
- MCV (Mean Corpuscular Volume): ${indices.mcv} fL (ค่าอ้างอิง: 80.0 - 100.0 fL) -> สถานะ: ${evaluations.mcv.labelTh}
- MCH (Mean Corpuscular Hemoglobin): ${indices.mch} pg (ค่าอ้างอิง: 27.0 - 31.0 pg) -> สถานะ: ${evaluations.mch.labelTh}
- MCHC (Mean Corpuscular Hb Concentration): ${indices.mchc} g/dL (ค่าอ้างอิง: 32.0 - 36.0 g/dL) -> สถานะ: ${evaluations.mchc.labelTh}
- Mentzer Index (MCV / RBC): ${indices.mentzerIndex} (${morphology.mentzerTh})

### 3. การประเมินทางสัณฐานวิทยาเบื้องต้น
- ลักษณะเม็ดเลือดแดง: ${morphology.morphologyLabelTh}
- การจำแนกขนาด (Size): ${morphology.sizeCategoryTh}
- การจำแนกความเข้มสี (Chromasia): ${morphology.chromicCategoryTh}

---
### คำสั่งสำหรับการวิเคราะห์ (กรุณาตอบเป็นภาษาไทย โดยใช้ Markdown จัดหัวข้อสวยงาม):
1. **สรุปความผิดปกติของสัณฐานวิทยาและดัชนีเม็ดเลือดแดง**: อธิบายค่า MCV, MCH, MCHC, Hb, Hct ว่าสะท้อนถึงอะไร
2. **การวินิจฉัยแยกโรคที่เป็นไปได้มากที่สุด (Differential Diagnosis)**: 
   - จัดลำดับโรคที่น่าจะเป็นไปได้มากที่สุด เช่น Iron Deficiency Anemia, Thalassemia Trait / Disease, Anemia of Chronic Disease, Megaloblastic Anemia, Sideroblastic Anemia, หรือสรีรวิทยาของการตั้งครรภ์
   - วิเคราะห์เปรียบเทียบโดยใช้ค่า Mentzer Index (${indices.mentzerIndex}) ร่วมด้วย
3. **การตรวจทางห้องปฏิบัติการเพื่อยืนยันการวินิจฉัย (Recommended Laboratory Workup)**: แนะนำการตรวจเพิ่มเติมที่จำเพาะเจาะจง (เช่น Serum Ferritin, Serum Iron/TIBC, Hemoglobin typing, PCR for alpha-thalassemia, Peripheral Blood Smear, Reticulocyte count)
4. **ข้อเสนอแนะทางคลินิกและการดูแลผู้ป่วยเบื้องต้น (Clinical Considerations & Patient Care)**
5. **ข้อจำกัดและข้อควรระวัง**: สิ่งที่ควรซักประวัติเพิ่มเติม (ประวัติครอบครัว, ประวัติการเสียเลือด, โภชนาการ)`;
}

export default async function handler(req, res) {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'รองรับเฉพาะ POST request เท่านั้น'
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'INVALID_JSON', message: 'รูปแบบ JSON ไม่ถูกต้อง' });
      }
    }

    const { calcData, model, userApiKey } = body || {};

    if (!calcData) {
      return res.status(400).json({
        error: 'MISSING_DATA',
        message: 'กรุณาส่งข้อมูลการคำนวณผลเลือด (calcData)'
      });
    }

    // Determine API Key: User custom key takes precedence if given, otherwise central Vercel env
    const activeApiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!activeApiKey) {
      return res.status(500).json({
        error: 'NO_API_KEY',
        message: 'ระบบกลางยังไม่ได้ตั้งค่า GEMINI_API_KEY บน Vercel และผู้ใช้ไม่ได้ระบุ API Key ส่วนตัว'
      });
    }

    // Supported models (strictly Gemini 3.5 Flash Lite & Gemini 3.6 Flash)
    const allowedModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'];
    const selectedModel = allowedModels.includes(model) ? model : 'gemini-3.5-flash-lite';

    const promptText = buildPrompt(calcData);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${activeApiKey.trim()}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 2500
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorDetail = '';
      let isQuota = response.status === 429;

      try {
        const errJson = await response.json();
        errorDetail = errJson?.error?.message || response.statusText;
        if (
          errJson?.error?.status === 'RESOURCE_EXHAUSTED' ||
          /quota|rate limit|exhausted/i.test(errorDetail)
        ) {
          isQuota = true;
        }
      } catch {
        errorDetail = response.statusText;
      }

      if (isQuota) {
        return res.status(429).json({
          error: 'QUOTA_EXCEEDED',
          message: 'โควต้าการใช้งาน Gemini API กลางหมดชั่วคราว หรือเกินขีดจำกัด (API Quota / Rate Limit Exceeded) กรุณารอสักครู่ หรือใช้ผลวิเคราะห์ทางโลหิตวิทยา (Offline Expert) แทน',
          detail: errorDetail
        });
      }

      if (response.status === 400 || response.status === 403) {
        return res.status(response.status).json({
          error: 'AUTH_OR_MODEL_ERROR',
          message: `API Key ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึงโมเดล (${errorDetail})`
        });
      }

      return res.status(response.status).json({
        error: 'API_ERROR',
        message: `การเชื่อมต่อ Gemini API ล้มเหลว (${response.status}): ${errorDetail}`
      });
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      return res.status(502).json({
        error: 'EMPTY_RESPONSE',
        message: 'ไม่ได้รับข้อความตอบกลับจากโมเดล Gemini'
      });
    }

    return res.status(200).json({
      success: true,
      analysis: candidate.content.parts[0].text,
      model: selectedModel,
      source: userApiKey ? 'custom_key' : 'central_api'
    });
  } catch (err) {
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: err.message || 'เกิดข้อผิดพลาดภายในระบบ Serverless Function'
    });
  }
}
