<?php
// ย่อ/บีบอัดรูปเก่าใน uploads/ ให้เล็กลง (โหลดเร็วขึ้น) — รันครั้งเดียวแล้วลบไฟล์นี้ทิ้ง
// เปิด /optimize.php ในเบราว์เซอร์ (หรือ php optimize.php)
// * ทับไฟล์เดิม (ย่อเฉพาะรูปที่กว้างเกิน 1400px) — สำรอง uploads/ ไว้ก่อนถ้ากังวลเรื่องคุณภาพ *
header('Content-Type: text/plain; charset=utf-8');
if (!function_exists('imagecreatefromstring')) exit("เครื่องนี้ไม่มี GD (ย่อรูปไม่ได้)\n");

$dir = __DIR__ . '/uploads';
$maxW = 1400;
$files = glob("$dir/*.{png,jpg,jpeg,PNG,JPG,JPEG}", GLOB_BRACE) ?: [];
$done = 0; $saved = 0;

foreach ($files as $path) {
    $before = filesize($path);
    $data = @file_get_contents($path);
    if ($data === false) continue;
    $img = @imagecreatefromstring($data);
    if (!$img) continue;
    $w = imagesx($img); $h = imagesy($img);
    if ($w > $maxW) {
        $nw = $maxW; $nh = (int) round($h * $maxW / $w);
        $dst = imagecreatetruecolor($nw, $nh);
        imagealphablending($dst, false); imagesavealpha($dst, true);
        imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($img); $img = $dst;
    }
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if ($ext === 'png') imagepng($img, $path, 6);
    else imagejpeg($img, $path, 82);
    imagedestroy($img);
    clearstatcache(true, $path);
    $after = filesize($path);
    $saved += max(0, $before - $after);
    $done++;
    echo sprintf("• %s  %dKB → %dKB\n", basename($path), $before / 1024, $after / 1024);
}
echo "\nเสร็จ: ย่อ $done ไฟล์ ประหยัดรวม " . round($saved / 1024) . " KB\n";
echo "อย่าลืมลบไฟล์ optimize.php ทิ้งหลังใช้เสร็จ\n";
