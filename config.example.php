<?php
// ===== ตัวอย่างการตั้งค่าฐานข้อมูล =====
// คัดลอกไฟล์นี้เป็น config.php แล้วใส่รหัสผ่าน MySQL ของคุณ
//   cp config.example.php config.php   (หรือ copy บน Windows)
// หมายเหตุ: config.php ถูกใส่ไว้ใน .gitignore แล้ว จะไม่ถูกอัปขึ้น GitHub
return [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'port' => getenv('DB_PORT') ?: '3306',
    'user' => getenv('DB_USER') ?: 'root',
    'pass' => getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : '',   // <-- ใส่รหัสผ่าน MySQL ที่นี่
    'name' => getenv('DB_NAME') ?: 'maywipa_portfolio',
];
