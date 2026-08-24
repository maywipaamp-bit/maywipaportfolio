# Maywipa.am — Portfolio (PHP / Herd)

พอร์ตโฟลิโอมือถือ + ระบบจัดการหลังบ้าน เขียนด้วย **PHP ล้วน (PDO + MySQL)** เพื่อรันบน **Laravel Herd** ได้ทันที
ทุก URL เป็น path แบบ relative จึงทำงานได้ทั้งที่ `maywipa.test/portfolio` (เครื่อง) และ `maywipa.com/portfolio` (จริง)

## ตำแหน่งไฟล์
อยู่ใน parked path ของ Herd แล้ว:
```
C:\Users\maywi\Herd\maywipa\portfolio\
```
- โฟลเดอร์ `maywipa` → Herd เสิร์ฟเป็น `http://maywipa.test`
- แอปอยู่ในซับโฟลเดอร์ `portfolio` → เข้าที่ `http://maywipa.test/portfolio/`

## เริ่มใช้งาน (3 ขั้นตอน)

### 1) ตั้งค่าฐานข้อมูล
คัดลอกไฟล์ตัวอย่างเป็น `config.php` แล้วใส่รหัสผ่าน MySQL ของคุณ:
```bash
cp config.example.php config.php   # Windows: copy config.example.php config.php
```
แก้บรรทัด `'pass'` ให้เป็นรหัสผ่าน MySQL (ค่าเริ่มต้น host `127.0.0.1`, port `3306`, user `root`)
> `config.php` อยู่ใน `.gitignore` แล้ว — รหัสผ่านจะไม่ถูกอัปขึ้น GitHub

### 2) สร้างฐานข้อมูล + ข้อมูลตัวอย่าง
เปิดในเบราว์เซอร์ครั้งเดียว:
```
http://maywipa.test/portfolio/setup.php
```
หรือรันผ่าน command line:
```bash
cd C:\Users\maywi\Herd\maywipa\portfolio
php setup.php
```
จะสร้าง database `maywipa_portfolio` + ตาราง + ข้อมูลตาม design (รันซ้ำได้ ไม่ใส่ข้อมูลซ้ำ)

### 3) เปิดใช้งาน
- หน้าแสดงผล:  http://maywipa.test/portfolio/
- หน้าจัดการ:  http://maywipa.test/portfolio/admin.php

> หลังสร้างเสร็จ ควรลบไฟล์ `setup.php` ทิ้ง หรือกันไม่ให้เข้าถึงจากภายนอก

## หน้าจัดการหลังบ้าน (admin.php)
หน้าตาเหมือนหน้าจริงทุกอย่าง เพิ่มปุ่ม แก้ไข / เพิ่ม / ลบ ทุกส่วน
(โปรไฟล์, ผลงาน + รูปแกลเลอรี, บริการ, ลูกค้า, ประสบการณ์ + โปรเจค, ช่องทางติดต่อ)
อัปโหลดรูปได้ (เก็บใน `uploads/`) — บันทึกลง MySQL ทันที ไม่มีระบบ Login

## ไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `config.php` | ค่าเชื่อมต่อ MySQL (แก้รหัสผ่านที่นี่) |
| `db.php` | PDO connection |
| `api.php` | REST API `?r=<resource>&id=<id>` ตาม HTTP method |
| `setup.php` | สร้าง DB + ตาราง + seed |
| `schema.sql` | โครงสร้างตาราง |
| `index.php` / `admin.php` | หน้าแสดงผล / หน้าจัดการ |
| `css/` `js/` `uploads/` | สไตล์ / สคริปต์ / รูปภาพ |

## ขึ้น production ที่ maywipa.com/portfolio
อัปโหลดทั้งโฟลเดอร์ไปไว้ใต้ web root ที่ path `/portfolio` (เช่น `public_html/portfolio`)
ตั้งค่า `config.php` ให้ตรงกับ MySQL ของโฮสต์ แล้วเปิด `setup.php` หนึ่งครั้ง (แล้วลบทิ้ง)
เพราะทุก path เป็น relative จึงไม่ต้องแก้โค้ดเพิ่ม
