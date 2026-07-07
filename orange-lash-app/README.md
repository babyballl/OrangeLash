# Orange Lash — คู่มือติดตั้งและ Deploy

เว็บแอปบัญชีร้าน Orange Lash เวอร์ชันอิสระ (ไม่พึ่ง Claude) ใช้ **Firebase Authentication (เข้าสู่ระบบด้วย Gmail)** และ **Firestore** เก็บข้อมูล

ทำตามขั้นตอนด้านล่างทีละข้อ ใช้เวลาประมาณ 20-30 นาที ไม่ต้องเขียนโค้ดเพิ่มเลยครับ

---

## ส่วนที่ 1: สร้างโปรเจกต์ Firebase (ฟรี)

1. เข้า https://console.firebase.google.com แล้ว login ด้วย Gmail ของคุณ
2. กด **"Add project" / "สร้างโปรเจกต์"**
3. ตั้งชื่อโปรเจกต์ เช่น `orange-lash` แล้วกดถัดไปเรื่อยๆ (ปิด Google Analytics ก็ได้ ไม่จำเป็น) จนกด **"Create project"**

### 1.1 เปิดใช้ Authentication (ระบบ login)
1. ในเมนูซ้าย ไปที่ **Build > Authentication**
2. กด **"Get started"**
3. แท็บ **Sign-in method** > กด **"Google"** > เปิดสวิตช์ **Enable**
4. เลือกอีเมลสำหรับติดต่อโปรเจกต์ (ใช้ Gmail ของคุณ) > กด **Save**

### 1.2 เปิดใช้ Firestore (ฐานข้อมูล)
1. ในเมนูซ้าย ไปที่ **Build > Firestore Database**
2. กด **"Create database"**
3. เลือกโหมด **"Start in production mode"**
4. เลือก location: **asia-southeast1 (Singapore)** (ใกล้ไทยที่สุด) > กด **Enable**

### 1.3 ตั้งค่ากฎความปลอดภัย (Security Rules)
1. ในหน้า Firestore Database ไปที่แท็บ **Rules**
2. ลบข้อความเดิมทั้งหมด แล้ววางเนื้อหาจากไฟล์ `firestore.rules` ที่แนบมาให้แทน
3. กด **Publish**

> กฎนี้จะทำให้แต่ละคนเข้าถึงได้แค่ข้อมูลร้านของตัวเองเท่านั้น คนอื่นที่ล็อกอินด้วย Gmail อื่นจะไม่เห็นข้อมูลคุณ

### 1.4 ลงทะเบียนเว็บแอป และคัดลอกค่า config
1. ในเมนูซ้าย กดไอคอนเฟือง ⚙️ ข้าง "Project Overview" > **Project settings**
2. เลื่อนลงมาที่ **"Your apps"** > กดไอคอน **`</>`** (Web)
3. ตั้งชื่อแอป เช่น `orange-lash-web` > กด **Register app**
4. จะเห็นโค้ดคล้ายๆ นี้ปรากฏขึ้นมา:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "orange-lash-xxxxx.firebaseapp.com",
     projectId: "orange-lash-xxxxx",
     storageBucket: "orange-lash-xxxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456"
   };
   ```
5. **คัดลอกค่าทั้งหมดนี้** แล้วนำไปวางแทนที่ใน `src/firebase.js` (ในโปรเจกต์นี้) — แทนที่ `YOUR_API_KEY`, `YOUR_PROJECT_ID` ฯลฯ ด้วยค่าจริงของคุณ

### 1.5 อนุญาตโดเมนที่จะใช้งานจริง (สำคัญ)
หลัง deploy ขึ้น Vercel/Netlify แล้ว (ส่วนที่ 3) จะได้โดเมนมา เช่น `orange-lash.vercel.app`
1. กลับไปที่ **Authentication > Settings > Authorized domains**
2. กด **"Add domain"** แล้วใส่โดเมนที่ได้จาก Vercel/Netlify (และโดเมนร้านของคุณเองถ้ามี)

---

## ส่วนที่ 2: รันทดสอบในเครื่องตัวเอง (ไม่บังคับ ข้ามไปส่วนที่ 3 ได้เลยถ้าไม่ถนัด)

ต้องมี [Node.js](https://nodejs.org) ติดตั้งในเครื่องก่อน

```bash
npm install
npm run dev
```

เปิด http://localhost:5173 ในเบราว์เซอร์

---

## ส่วนที่ 3: Deploy ขึ้นเว็บจริง (ฟรี ผ่าน Vercel)

1. สมัครบัญชีที่ https://vercel.com (สมัครด้วย Gmail หรือ GitHub ก็ได้ ฟรี)
2. วิธีอัปโหลดโปรเจกต์ มี 2 แบบ เลือกแบบที่ถนัด:

**แบบง่าย (ลากไฟล์วาง):**
- กด **"Add New" > "Project"**
- เลือก **"Deploy"** แบบไม่ผ่าน Git แล้วลากโฟลเดอร์โปรเจกต์นี้ทั้งหมดวางลงไป

**แบบมาตรฐาน (ผ่าน GitHub — แนะนำ เพราะแก้ไขและอัปเดตในอนาคตง่ายกว่า):**
- อัปโหลดโฟลเดอร์นี้ขึ้น GitHub repository ใหม่
- ใน Vercel กด **"Add New" > "Project"** > เลือก repository นั้น
- Framework Preset จะตรวจพบ **Vite** อัตโนมัติ > กด **Deploy**

3. รอสักครู่ จะได้ลิงก์เว็บ เช่น `https://orange-lash.vercel.app`
4. **สำคัญ:** กลับไปทำขั้นตอน **1.5** (เพิ่มโดเมนนี้ใน Authorized domains ของ Firebase) ไม่งั้นปุ่ม Gmail login จะ error

### ต่อโดเมนร้านของคุณเอง (ถ้ามี)
ใน Vercel: Project Settings > Domains > ใส่โดเมนของคุณ แล้วตั้งค่า DNS ตามที่ Vercel บอก (ปกติจะให้ไปเพิ่ม CNAME record ที่ผู้ให้บริการโดเมน)

---

## เพิ่มไอคอนหน้าโฮมมือถือ (PWA)
เปิดเว็บที่ deploy แล้วผ่าน Chrome/Safari บนมือถือ > เมนูแชร์ > "เพิ่มลงหน้าจอโฮม"

---

## โครงสร้างข้อมูลใน Firestore
ข้อมูลจะถูกเก็บใน:
```
users/{your-uid}/app/data      → รายรับ, รายจ่าย, สต็อก, คิว, log
users/{your-uid}/app/profile   → รูปโปรไฟล์ร้าน
```
แต่ละคนที่ล็อกอินด้วย Gmail คนละอันจะมีข้อมูลแยกกันอัตโนมัติ ไม่ปนกัน

## หากอยากให้พนักงานใช้ร่วมด้วย
เวอร์ชันนี้ยังเป็นแบบ "หนึ่ง Gmail = หนึ่งชุดข้อมูล" (เจ้าของร้านคนเดียว) ถ้าต้องการให้พนักงานหลายคนเห็นข้อมูลร้านเดียวกันได้ ต้องปรับโครงสร้าง Firestore เพิ่มเติม (เช่น ผูกกับ "รหัสร้าน" แทน uid ส่วนตัว) แจ้งได้ถ้าต้องการให้ช่วยปรับส่วนนี้ต่อ
