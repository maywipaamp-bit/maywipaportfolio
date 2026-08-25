<?php
// สร้างฐานข้อมูล + ตาราง + ข้อมูลตัวอย่าง
// รันผ่าน CLI:  php setup.php    หรือเปิดในเบราว์เซอร์:  /portfolio/setup.php
// * หลังติดตั้งเสร็จควรลบไฟล์นี้ทิ้ง หรือกันไม่ให้เข้าถึงจากภายนอก *
require __DIR__ . '/db.php';
$cli = php_sapi_name() === 'cli';
$nl = $cli ? "\n" : "<br>";
if (!$cli) header('Content-Type: text/html; charset=utf-8');
function say($m) { global $nl; echo $m . $nl; @flush(); }

$cfg = require __DIR__ . '/config.php';

try {
    $root = db(false);
    $root->exec("CREATE DATABASE IF NOT EXISTS `{$cfg['name']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    say("✔ database `{$cfg['name']}` พร้อมใช้งาน");

    $pdo = db(true);

    $sql = file_get_contents(__DIR__ . '/schema.sql');
    $sql = preg_replace('/CREATE DATABASE[^;]*;/i', '', $sql);
    $sql = preg_replace('/USE\s+`?[a-z0-9_]+`?\s*;/i', '', $sql);
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
        if ($stmt !== '') $pdo->exec($stmt);
    }
    say("✔ สร้างตารางครบแล้ว");

    migrate($pdo);
    seed($pdo);
    say($nl . "เสร็จเรียบร้อย! เปิดเว็บได้ที่  /portfolio/  (อย่าลืมลบ setup.php ทิ้ง)");
} catch (Throwable $e) {
    http_response_code(500);
    say("✘ ผิดพลาด: " . $e->getMessage());
    if (strpos($e->getMessage(), 'Access denied') !== false) say("→ ตรวจสอบ user/รหัสผ่านใน config.php");
    if (strpos($e->getMessage(), 'refused') !== false || strpos($e->getMessage(), '2002') !== false) say("→ MySQL ยังไม่ทำงาน หรือ host/port ไม่ถูกต้อง");
    exit(1);
}

function count_rows(PDO $p, string $t): int { return (int) $p->query("SELECT COUNT(*) FROM `$t`")->fetchColumn(); }

// อัปเกรดตารางเดิม (เพิ่มคอลัมน์ที่ขาด + จัดลำดับติดต่อ) — ปลอดภัยรันซ้ำ
function migrate(PDO $pdo) {
    $add = function ($table, $col, $def) use ($pdo) {
        if (!$pdo->query("SHOW COLUMNS FROM `$table` LIKE '$col'")->fetch()) {
            $pdo->exec("ALTER TABLE `$table` ADD COLUMN $col $def");
            say("  + เพิ่มคอลัมน์ $table.$col");
        }
    };
    $add('works', 'category', "VARCHAR(60) NOT NULL DEFAULT '' AFTER tags");
    $add('works', 'cta_label', "VARCHAR(80) NOT NULL DEFAULT ''");
    $add('works', 'cta_url', "VARCHAR(255) NOT NULL DEFAULT ''");
    $add('experience_projects', 'logo', "VARCHAR(255) NOT NULL DEFAULT '' AFTER meta");
    $add('experience_projects', 'org', "VARCHAR(160) NOT NULL DEFAULT ''");
    $add('experience_projects', 'role', "VARCHAR(160) NOT NULL DEFAULT ''");
    $add('experience_projects', 'responsibility', "VARCHAR(500) NOT NULL DEFAULT ''");
    $add('experience_projects', 'year', "VARCHAR(40) NOT NULL DEFAULT '' AFTER logo");
    $pdo->exec("UPDATE experience_projects SET org=TRIM(SUBSTRING_INDEX(meta,' · ',1)), role=TRIM(SUBSTRING_INDEX(meta,' · ',-1)) WHERE org='' AND meta LIKE '% · %'");
    $add('profile', 'clients_intro', "VARCHAR(500) NOT NULL DEFAULT '' AFTER footer");
    $add('works', 'views', "INT NOT NULL DEFAULT 0");
    $add('services', 'views', "INT NOT NULL DEFAULT 0");
    $pdo->prepare("UPDATE profile SET clients_intro=? WHERE id=1 AND clients_intro=''")->execute(['ขอบคุณสำหรับความไว้วางใจในการร่วมงานค่ะ']);
    // จัดลำดับช่องทางติดต่อ: LINE, เบอร์, อีเมล
    $pdo->exec("UPDATE contacts SET sort_order=0 WHERE grp='contact' AND icon='line'");
    $pdo->exec("UPDATE contacts SET sort_order=1 WHERE grp='contact' AND icon='phone'");
    $pdo->exec("UPDATE contacts SET sort_order=2 WHERE grp='contact' AND icon='mail'");
    $pdo->exec("CREATE TABLE IF NOT EXISTS service_images (id INT AUTO_INCREMENT PRIMARY KEY, service_id INT NOT NULL, url VARCHAR(255) NOT NULL DEFAULT '', sort_order INT NOT NULL DEFAULT 0, FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("UPDATE profile SET clients_intro='ขอบคุณสำหรับความไว้วางใจในการร่วมงานค่ะ' WHERE id=1 AND (clients_intro='' OR clients_intro LIKE 'รับงานพัฒนา%' OR clients_intro LIKE 'ขอบคุณสำหรับความไว้วางใจในการร่วมพัฒนา%')");
    say("  · อัปเกรดโครงสร้าง/ลำดับเรียบร้อย");
}

function seed(PDO $pdo) {
    if (count_rows($pdo, 'profile') === 0) {
        $pdo->prepare("INSERT INTO profile (id,name,bio,photo,footer,clients_intro) VALUES (1,?,?,?,?,?)")->execute([
            'Maywipa.am',
            'สวัสดีค่ะ ฉันชื่อเมย์ นักวิเคราะห์ข้อมูลและผู้เชี่ยวชาญด้านเอกสารระบบสารสนเทศ รับทำคู่มือการใช้งานระบบ คีย์ข้อมูล และจัดทำรายงาน ถูกต้อง ตรงเวลา ดูแลงานของคุณทุกขั้นตอนค่ะ',
            'uploads/img-am.png',
            '© 2026 Maywipa.am · Portfolio',
            'ขอบคุณสำหรับความไว้วางใจในการร่วมงานค่ะ',
        ]);
        say("  · seeded profile");
    }
    if (count_rows($pdo, 'works') === 0) {
        // [title, tags, description, category]
        $works = [
            ['คู่มือการใช้งานระบบ | User Manual', 'MS Word,Canva', 'จัดทำคู่มือการใช้งานระบบสารสนเทศแบบ Step-by-step พร้อมภาพหน้าจอประกอบทุกขั้นตอน จัดรูปเล่มสวยงาม อ่านง่าย เหมาะสำหรับส่งมอบให้ผู้ใช้งานจริง (แก้ไขคำอธิบายได้)', 'คู่มือ'],
            ['Dashboard รายงานยอดขาย', 'Excel,Power BI', 'ออกแบบ Dashboard สรุปยอดขายรายเดือน เปรียบเทียบเป้าหมาย พร้อมกราฟที่เข้าใจง่าย ช่วยให้ผู้บริหารตัดสินใจได้เร็วขึ้น (แก้ไขคำอธิบายได้)', 'รายงาน'],
            ['เอกสารระบบสารสนเทศ', 'MS Word,Visio', 'จัดทำเอกสารประกอบระบบ เช่น Flowchart, ER Diagram และเอกสารความต้องการระบบ ครบถ้วนตามมาตรฐาน (แก้ไขคำอธิบายได้)', 'เอกสาร'],
            ['ฐานข้อมูล Excel', 'Excel,Google Sheets', 'ออกแบบฐานข้อมูลและแบบฟอร์มคีย์ข้อมูลใน Excel พร้อมสูตรตรวจสอบความถูกต้อง ลดข้อผิดพลาดในการกรอกข้อมูล (แก้ไขคำอธิบายได้)', 'ฐานข้อมูล'],
        ];
        $iw = $pdo->prepare("INSERT INTO works (title,tags,category,description,thumb,cta_label,cta_url,sort_order) VALUES (?,?,?,?,?,?,?,?)");
        $ii = $pdo->prepare("INSERT INTO work_images (work_id,url,sort_order) VALUES (?,?,?)");
        foreach ($works as $i => $w) {
            $iw->execute([$w[0], $w[1], $w[3], $w[2], '', 'สนใจจ้างงานนี้', 'https://line.me/ti/p/~maywipa', $i]);
            $wid = $pdo->lastInsertId();
            for ($s = 0; $s < 3; $s++) $ii->execute([$wid, '', $s]);
        }
        say("  · seeded works");
    }
    if (count_rows($pdo, 'services') === 0) {
        $rows = [
            ['document', 'รับทำคู่มือการใช้งานระบบ | User Manual', 'เอกสารระบบสารสนเทศ · เริ่มต้น ฿1,500'],
            ['table', 'คีย์ข้อมูล / Data Entry', 'Excel · Google Sheets · เริ่มต้น ฿500'],
            ['chart', 'วิเคราะห์ข้อมูล & รายงาน', 'Dashboard · Report · เริ่มต้น ฿2,000'],
        ];
        $st = $pdo->prepare("INSERT INTO services (icon,title,subtitle,sort_order) VALUES (?,?,?,?)");
        foreach ($rows as $i => $r) $st->execute([$r[0], $r[1], $r[2], $i]);
        say("  · seeded services");
    }
    if (count_rows($pdo, 'clients') === 0) {
        $st = $pdo->prepare("INSERT INTO clients (name,logo,sort_order) VALUES (?,?,?)");
        for ($i = 1; $i <= 6; $i++) $st->execute(["ชื่อบริษัท $i", '', $i - 1]);
        say("  · seeded clients");
    }
    if (count_rows($pdo, 'experiences') === 0) {
        $exps = [
            ['ฟรีแลนซ์ · Fastwork', '2567 – ปัจจุบัน', 'รับทำคู่มือระบบและงานข้อมูล 10+ ออเดอร์ คะแนนรีวิวเฉลี่ย 4.8', 0,
                [['คู่มือการใช้งานระบบ ERP', 'บริษัทเอกชน · จัดทำคู่มือผู้ใช้'], ['Dashboard ยอดขายรายเดือน', 'ร้านค้าออนไลน์ · วิเคราะห์ข้อมูล']]],
            ['เจ้าหน้าที่ระบบสารสนเทศ', '2565 – 2567 · ชื่อบริษัท (แก้ไขได้)', 'จัดทำเอกสารระบบ คู่มือผู้ใช้ และดูแลฐานข้อมูลภายในองค์กร', 0,
                [['ระบบสารสนเทศบุคลากร', 'ฝ่ายทรัพยากรบุคคล · จัดทำเอกสารระบบ'], ['ระบบฐานข้อมูลครุภัณฑ์', 'ฝ่ายพัสดุ · ดูแลฐานข้อมูล']]],
            ['ปริญญาตรี เทคโนโลยีสารสนเทศ', 'ชื่อมหาวิทยาลัย (แก้ไขได้)', '', 1, []],
        ];
        $ie = $pdo->prepare("INSERT INTO experiences (title,period,summary,is_edu,sort_order) VALUES (?,?,?,?,?)");
        $ip = $pdo->prepare("INSERT INTO experience_projects (experience_id,name,meta,sort_order) VALUES (?,?,?,?)");
        foreach ($exps as $i => $e) {
            $ie->execute([$e[0], $e[1], $e[2], $e[3], $i]);
            $eid = $pdo->lastInsertId();
            foreach ($e[4] as $p => $pr) $ip->execute([$eid, $pr[0], $pr[1], $p]);
        }
        say("  · seeded experiences");
    }
    if (count_rows($pdo, 'contacts') === 0) {
        $rows = [
            ['contact', 'line', 'LINE ID', '@maywipa', 'https://line.me/ti/p/~maywipa'],
            ['contact', 'phone', 'โทรศัพท์', '081-234-5678', 'tel:0812345678'],
            ['contact', 'mail', 'อีเมล', 'maywipa@email.com', 'mailto:maywipa@email.com'],
            ['social', 'instagram', 'Instagram', '@maywipa.am', 'https://instagram.com/maywipa.am'],
            ['social', 'facebook', 'Facebook', 'Maywipa.am', 'https://facebook.com/maywipa.am'],
            ['social', 'tiktok', 'TikTok', '@maywipa.am', 'https://tiktok.com/@maywipa.am'],
        ];
        $st = $pdo->prepare("INSERT INTO contacts (grp,icon,label,value,href,sort_order) VALUES (?,?,?,?,?,?)");
        foreach ($rows as $i => $r) $st->execute([$r[0], $r[1], $r[2], $r[3], $r[4], $i]);
        say("  · seeded contacts");
    }
}
