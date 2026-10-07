# Osteria Nero — Frontend

เว็บไซต์ร้านอาหารอิตาเลียนสไตล์คลาสสิก เรียบหรู ทันสมัย โทนดำ เทา ขาว
สร้างด้วย **React 18 + Vite + React Router** (ส่วน backend ใช้ Node.js + MySQL)

## หน้าทั้งหมด

| หน้า | เส้นทาง | ไฟล์ |
| --- | --- | --- |
| หน้าแรก | `/` | `src/pages/Home.jsx` |
| เมนู | `/menu` | `src/pages/Menu.jsx` |
| จองโต๊ะ | `/reservation` | `src/pages/Reservation.jsx` |
| สมัครสมาชิก | `/register` | `src/pages/Register.jsx` |
| เข้าสู่ระบบ | `/login` | `src/pages/Login.jsx` |

สไตล์ทั้งหมดอยู่ที่ `src/styles.css` (ปรับสีได้ที่ตัวแปรใน `:root`)

## เริ่มใช้งาน

```bash
npm install
npm run dev        # เปิดที่ http://localhost:5173
npm run build      # สร้างไฟล์สำหรับ deploy ในโฟลเดอร์ dist
```

ต้องใช้ Node.js 18 ขึ้นไป

## โหมดสาธิต และการเชื่อมต่อ backend

ไฟล์ `.env` ตั้งค่า `VITE_USE_MOCK=true` ไว้ให้ เว็บจึงทำงานได้ทันทีโดยยังไม่มี backend
(เมนูมาจาก `src/data/menu.js`, สมาชิกและการจองเก็บใน localStorage ของเบราว์เซอร์)

เมื่อ backend พร้อม ให้แก้ `.env` เป็น

```
VITE_USE_MOCK=false
VITE_API_URL=/api
```

Vite จะ proxy คำขอ `/api` ไปที่ `http://localhost:5000` (แก้ได้ใน `vite.config.js`)
ถ้า deploy จริง ให้ตั้ง `VITE_API_URL` เป็น URL เต็มของ API

## API ที่ frontend เรียกใช้

| Method | Path | Body | ผลลัพธ์ที่คาดหวัง |
| --- | --- | --- | --- |
| GET | `/api/menu` | — | `[{ id, category, name, description, price, vegetarian }]` |
| POST | `/api/auth/register` | `{ name, email, phone, password }` | `201` พร้อม `{ message }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user: { id, name, email, phone } }` |
| POST | `/api/reservations` | `{ name, phone, email, date, time, guests, note }` | `{ id, code }` (ส่ง `Authorization: Bearer <token>` มาด้วยถ้าล็อกอินอยู่) |

กรณีผิดพลาด ให้ตอบ status 4xx/5xx พร้อม `{ "message": "ข้อความภาษาไทยที่แสดงให้ผู้ใช้เห็น" }`
`category` ของเมนูต้องเป็นหนึ่งใน `antipasti`, `primi`, `pizze`, `secondi`, `dolci`, `bevande`

## ตารางฐานข้อมูล MySQL ที่แนะนำ

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category ENUM('antipasti','primi','pizze','secondi','dolci','bevande') NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  price DECIMAL(8,2) NOT NULL,
  vegetarian BOOLEAN DEFAULT FALSE
);

CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(12) NOT NULL UNIQUE,
  user_id INT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(160) NOT NULL,
  reserve_date DATE NOT NULL,
  reserve_time TIME NOT NULL,
  guests TINYINT NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

เมื่อทำ backend ควรเก็บรหัสผ่านด้วย bcrypt และออก token แบบ JWT
(โหมดสาธิตเก็บรหัสผ่านแบบไม่เข้ารหัสในเบราว์เซอร์ ใช้เพื่อดูหน้าตาเท่านั้น)

## ข้อมูลที่ควรแก้ก่อนเปิดใช้งานจริง

- ที่อยู่และเบอร์โทร: `src/pages/Home.jsx` และ `src/components/Footer.jsx`
- ชื่อร้าน: `src/components/Navbar.jsx`, `src/components/Footer.jsx`, `index.html`
- เมนูตัวอย่าง: `src/data/menu.js`
