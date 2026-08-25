<?php
// ===== OG/SEO แบบไดนามิก: ถ้าเปิดผลงานเฉพาะชิ้น (?w=ID หรือ /work/ID) ให้โชว์ชื่อ+รูปงานนั้นตอนแชร์ =====
$base = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'maywipa.com');
$defTitle = 'เมวิภา หาดกระโทก (Maywipa.am) — นักวิเคราะห์ข้อมูล & เอกสารระบบสารสนเทศ';
$defDesc  = 'พอร์ตโฟลิโอของ นางสาวเมวิภา หาดกระโทก (Maywipa.am · Maywipa Ammy · แอมมี่) นักวิเคราะห์ข้อมูลและผู้เชี่ยวชาญด้านเอกสารระบบสารสนเทศ รับทำคู่มือการใช้งานระบบ คีย์ข้อมูล และจัดทำรายงาน';
$ogTitle = $defTitle; $ogDesc = $defDesc;
$ogImage = $base . '/uploads/img-am.png';
$ogUrl   = $base . '/';
$reqUri  = $_SERVER['REQUEST_URI'] ?? '';
$isWorkPath = (bool) preg_match('#/work/\d+#', $reqUri);

$wid = 0;
if (isset($_GET['w'])) $wid = (int) $_GET['w'];
elseif (preg_match('#/work/(\d+)#', $reqUri, $m)) $wid = (int) $m[1];

if ($wid > 0) {
    try {
        require_once __DIR__ . '/db.php';
        $pdo = db(true);
        $st = $pdo->prepare('SELECT title, description FROM works WHERE id=?');
        $st->execute([$wid]);
        if ($w = $st->fetch()) {
            $ogTitle = $w['title'] . ' · ผลงาน Maywipa.am';
            $d = trim(preg_replace('/\s+/', ' ', (string) $w['description']));
            if ($d !== '') $ogDesc = mb_substr($d, 0, 160);
            $st2 = $pdo->prepare("SELECT url FROM work_images WHERE work_id=? AND url<>'' ORDER BY sort_order, id LIMIT 1");
            $st2->execute([$wid]);
            if ($u = $st2->fetchColumn()) $ogImage = $base . '/' . ltrim($u, '/');
            $ogUrl = $base . '/work/' . $wid;
        }
    } catch (Throwable $e) { /* ใช้ค่า default */ }
}
$h = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
?><!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="favicon.png">
<?php if ($isWorkPath): ?><base href="<?= $h($base) ?>/"><?php endif; ?>

<!-- ===== SEO ===== -->
<title><?= $h($ogTitle) ?></title>
<meta name="description" content="<?= $h($ogDesc) ?>">
<meta name="keywords" content="เมวิภา หาดกระโทก, เมวิภา, Maywipa.am, Maywipa Ammy, แอมมี่, นักวิเคราะห์ข้อมูล, รับทำคู่มือการใช้งานระบบ, คีย์ข้อมูล, เอกสารระบบสารสนเทศ, พอร์ตโฟลิโอ">
<meta name="author" content="เมวิภา หาดกระโทก (Maywipa.am)">
<meta name="robots" content="index, follow">
<link rel="canonical" href="<?= $h($ogUrl) ?>">

<!-- Open Graph (แชร์โซเชียล) -->
<meta property="og:type" content="website">
<meta property="og:title" content="<?= $h($ogTitle) ?>">
<meta property="og:description" content="<?= $h($ogDesc) ?>">
<meta property="og:url" content="<?= $h($ogUrl) ?>">
<meta property="og:image" content="<?= $h($ogImage) ?>">
<meta property="og:locale" content="th_TH">
<meta name="twitter:card" content="summary_large_image">

<!-- ข้อมูลโครงสร้าง (บอก Google ว่าเป็นบุคคล + ชื่อทุกแบบ) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "เมวิภา หาดกระโทก",
  "alternateName": ["Maywipa.am", "Maywipa Ammy", "แอมมี่", "เมวิภา", "นางสาวเมวิภา หาดกระโทก"],
  "url": "https://maywipa.com/",
  "image": "https://maywipa.com/uploads/img-am.png",
  "jobTitle": "นักวิเคราะห์ข้อมูล และผู้เชี่ยวชาญด้านเอกสารระบบสารสนเทศ",
  "sameAs": ["https://instagram.com/maywipa.am", "https://facebook.com/maywipa.am", "https://tiktok.com/@maywipa.am"]
}
</script>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css?v=<?php echo @filemtime(__DIR__ . '/css/style.css'); ?>">
</head>
<body>
  <div class="page">
    <div class="card">
      <div class="blob"></div>
      <div class="header" id="header">
        <span class="name">Maywipa.am</span>
        <p class="bio">นางสาวเมวิภา หาดกระโทก (แอมมี่) · นักวิเคราะห์ข้อมูลและผู้เชี่ยวชาญด้านเอกสารระบบสารสนเทศ รับทำคู่มือการใช้งานระบบ คีย์ข้อมูล และจัดทำรายงาน</p>
      </div>
      <div class="tabs" id="tabs"></div>
      <div class="content" id="content"><div class="loading"><span class="ld-dot"></span><span class="ld-dot"></span><span class="ld-dot"></span></div></div>
    </div>
    <div class="footer" id="footer">© 2026 Maywipa.am · Portfolio</div>
  </div>
  <script>window.APP_BASE = '';</script>
  <script src="js/render.js?v=<?php echo @filemtime(__DIR__ . '/js/render.js'); ?>"></script>
</body>
</html>
