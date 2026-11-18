# 🩸 HemaCalc AI - ระบบคำนวณและแปลผลดัชนีเม็ดเลือดแดง (RBC Indices Analyzer)

เว็บแอปพลิเคชันทางการแพทย์สำหรับการคำนวณและแปลผลค่าดัชนีเม็ดเลือดแดง (**MCV, MCH, MCHC**) และดัชนีเมนท์เซอร์ (**Mentzer Index**) พร้อมระบบ AI ที่ปรึกษาโลหิตวิทยาด้วย **Google Gemini API**

---

## ✨ ฟีเจอร์สำคัญ (Key Features)

1. **การคำนวณและแปลผลค่าดัชนีเม็ดเลือดแดง (RBC Indices)**:
   - รองรับการกรอก **Hemoglobin (Hb)** ทั้งแบบคำนวณจาก **Absorbance × Factor** และการกรอกค่าตรง
   - คำนวณ **MCV**, **MCH**, **MCHC**, และ **Mentzer Index** แบบเรียลไทม์
   - เทียบเคียงกับช่วงค่าอ้างอิงมาตรฐานตามกลุ่มประชากร (ชาย, หญิง และเด็กตามช่วงอายุ) พร้อมเกจวัดเปรียบเทียบระดับความเข้มข้น

2. **ระบบบันทึกข้อมูลและประวัติการกรอก (LocalStorage History & Draft)**:
   - **Autosave Draft**: บันทึกค่าที่กำลังพิมพ์ในฟอร์มอัตโนมัติ ป้องกันข้อมูลสูญหายเมื่อรีเฟรชหน้าเว็บ
   - **Calculation History**: บันทึกประวัติการคำนวณและข้อมูลผู้ป่วยพร้อมวัน-เวลา
   - **Restore & Export**: สามารถกดโหลดประวัติเก่ากลับเข้าฟอร์ม, คัดลอกสรุปผล, และดาวน์โหลดประวัติเป็นไฟล์ JSON

3. **Gemini AI ที่ปรึกษาโลหิตวิทยา (Clinical Hematology AI)**:
   - เชื่อมต่อผ่าน **API กลางบน Vercel Serverless Function** (`/api/gemini`) รักษาความปลอดภัยของ API Key ไม่รั่วไหลไปยังฝั่งผู้ใช้
   - โมเดลที่กำหนดให้ใช้งาน:
     - ⚡ **Gemini 3.5 Flash Lite** (แนะนำ - เบา รวดเร็ว ประหยัดโควต้า)
     - 🚀 **Gemini 3.6 Flash** (ประมวลผลเร็วพิเศษ ตรรกะการวิเคราะห์สูง)
   - **ระบบแจ้งเตือนเมื่อโควต้าหมด (Quota Alert)**: หากโควต้า API กลางหมดชั่วคราว (HTTP 429) ระบบจะแสดงหน้าต่างแจ้งเตือนและสลับไปใช้ **Offline Expert Hematology Engine** ให้ทันที หรือให้ผู้ใช้ใส่ API Key ส่วนตัวได้

---

## 🚀 คู่มือการ Deploy ด้วย GitHub ลง Vercel

### ขั้นตอนที่ 1: Push โค้ดขึ้น GitHub
1. ตรวจสอบสถานะโค้ดในโปรเจกต์:
   ```bash
   git status
   ```
2. ทำการ Commit และ Push ไปยัง Repository บน GitHub:
   ```bash
   git add .
   git commit -m "feat: Add central Vercel API proxy, history storage, quota warning modal, and Gemini 3.5/3.6 models"
   git push origin main
   ```

---

### ขั้นตอนที่ 2: นำเข้าโปรเจกต์บน Vercel (Import to Vercel)
1. เข้าไปที่ [Vercel Dashboard](https://vercel.com/) แล้วล็อกอินด้วยบัญชี GitHub
2. คลิกปุ่ม **"Add New..."** -> เลือก **"Project"**
3. ค้นหา Repository `HemaCal` ของคุณ แล้วคลิก **"Import"**
4. ตั้งค่าโปรเจกต์ (Vercel จะตรวจจับอัตโนมัติ):
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

---

### ขั้นตอนที่ 3: ตั้งค่า API Key กลาง (Environment Variables)
1. ในหน้าก่อนกด Deploy (หรือไปที่ **Project Settings** > **Environment Variables** บน Vercel):
2. เพิ่มตัวแปร:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: *[ใส่ Gemini API Key ของคุณที่ได้จาก [Google AI Studio](https://aistudio.google.com/app/apikey)]*
3. คลิกปุ่ม **"Save"** หรือ **"Deploy"**

> 💡 **หมายเหตุ**: เมื่อตั้งค่า `GEMINI_API_KEY` ใน Environment Variables แล้ว Serverless Function ที่ `/api/gemini` จะดึงคีย์นี้ไปใช้งานเป็น API กลางให้ผู้ใช้ทุกคนโดยอัตโนมัติ โดยที่คีย์จะไม่ถูกเปิดเผยในฝั่ง Client

---

## 💻 การทดสอบและรันในเครื่อง (Local Development)

1. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```

2. สร้างไฟล์ `.env` (หากต้องการทดสอบ API กลางในเครื่อง):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. รันเซิร์ฟเวอร์สำหรับพัฒนา:
   ```bash
   npm run dev
   ```
   หรือรันผ่านไฟล์ `start.bat`

4. ทดสอบ Build เพื่อส่งขึ้น Production:
   ```bash
   npm run build
   ```

---

## 📋 ลิขสิทธิ์และข้อจำกัดความรับผิดชอบ (Medical Disclaimer)
แอปพลิเคชันนี้จัดทำขึ้นเพื่อการศึกษา การสนับสนุนการเรียนรู้ทางโลหิตวิทยา (Hematology) และการคำนวณเบื้องต้นเท่านั้น **ไม่สามารถใช้ทดแทนการวินิจฉัย การตรวจรักษา หรือคำแนะนำทางการแพทย์โดยแพทย์ผู้เชี่ยวชาญได้**
