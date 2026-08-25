<?php
// REST-style API (single entry). ใช้ผ่าน  api.php?r=<resource>&id=<id>  ตาม HTTP method
require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$r = $_GET['r'] ?? '';
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

function body(): array {
    $raw = file_get_contents('php://input');
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}
function pick(array $src, array $allowed): array {
    $out = [];
    foreach ($allowed as $k) if (array_key_exists($k, $src)) $out[$k] = $src[$k];
    return $out;
}
function insert(PDO $p, string $t, array $data): int {
    $cols = array_keys($data);
    $ph = implode(',', array_fill(0, count($cols), '?'));
    $sql = "INSERT INTO `$t` (`" . implode('`,`', $cols) . "`) VALUES ($ph)";
    $p->prepare($sql)->execute(array_values($data));
    return (int) $p->lastInsertId();
}
function update(PDO $p, string $t, int $id, array $data): void {
    if (!$data) return;
    $set = implode(', ', array_map(fn($c) => "`$c`=?", array_keys($data)));
    $vals = array_values($data);
    $vals[] = $id;
    $p->prepare("UPDATE `$t` SET $set WHERE id=?")->execute($vals);
}
function remove(PDO $p, string $t, int $id): void {
    $p->prepare("DELETE FROM `$t` WHERE id=?")->execute([$id]);
}
function ok($x = ['ok' => true]) { echo json_encode($x, JSON_UNESCAPED_UNICODE); exit; }
function fail($msg, $code = 500) { http_response_code($code); echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE); exit; }

// ย่อ + บีบอัดรูปให้เล็กลง (โหลดเร็วขึ้น) ถ้ามี GD
function optimize_image(string $path, int $maxW = 1400): void {
    if (!function_exists('imagecreatefromstring')) return;
    $data = @file_get_contents($path);
    if ($data === false) return;
    $img = @imagecreatefromstring($data);
    if (!$img) return;
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
}

try {
    if ($method !== 'GET' && $r !== 'view') admin_guard();   // อ่านสาธารณะได้ แต่แก้ไขต้องล็อกอิน
    $pdo = db(true);

    // ---------- read all ----------
    if ($r === 'portfolio' && $method === 'GET') {
        $profile = $pdo->query("SELECT * FROM profile WHERE id=1")->fetch() ?: null;
        $works = $pdo->query("SELECT * FROM works ORDER BY sort_order,id")->fetchAll();
        $images = $pdo->query("SELECT * FROM work_images ORDER BY sort_order,id")->fetchAll();
        $services = $pdo->query("SELECT * FROM services ORDER BY sort_order,id")->fetchAll();
        $clients = $pdo->query("SELECT * FROM clients ORDER BY sort_order,id")->fetchAll();
        $exps = $pdo->query("SELECT * FROM experiences ORDER BY sort_order,id")->fetchAll();
        $projs = $pdo->query("SELECT * FROM experience_projects ORDER BY sort_order,id")->fetchAll();
        $contacts = $pdo->query("SELECT * FROM contacts ORDER BY sort_order,id")->fetchAll();
        $simages = $pdo->query("SELECT * FROM service_images ORDER BY sort_order,id")->fetchAll();
        foreach ($services as &$sv) { $sv['images'] = array_values(array_filter($simages, fn($im) => $im['service_id'] == $sv['id'])); }
        unset($sv);
        foreach ($works as &$w) {
            $w['tags'] = $w['tags'] !== '' ? array_values(array_filter(array_map('trim', explode(',', $w['tags'])))) : [];
            $w['images'] = array_values(array_filter($images, fn($im) => $im['work_id'] == $w['id']));
        }
        unset($w);
        foreach ($exps as &$e) {
            $e['is_edu'] = (int) $e['is_edu'];
            $e['projects'] = array_values(array_filter($projs, fn($p) => $p['experience_id'] == $e['id']));
        }
        unset($e);
        ok(compact('profile', 'works', 'services', 'clients', 'contacts') + ['experiences' => $exps]);
    }

    // ---------- upload ----------
    if ($r === 'upload' && $method === 'POST') {
        if (empty($_FILES['image'])) fail('ไม่มีไฟล์', 400);
        $f = $_FILES['image'];
        if ($f['error'] !== UPLOAD_ERR_OK) fail('อัปโหลดไม่สำเร็จ', 400);
        $mime = mime_content_type($f['tmp_name']);
        if (strpos($mime, 'image/') !== 0) fail('รองรับเฉพาะไฟล์รูปภาพ', 400);
        $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION) ?: 'png');
        $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'png';
        $name = 'img-' . time() . '-' . random_int(1000, 999999) . '.' . $ext;
        $dir = __DIR__ . '/uploads';
        if (!is_dir($dir)) mkdir($dir, 0775, true);
        if (!move_uploaded_file($f['tmp_name'], "$dir/$name")) fail('บันทึกไฟล์ไม่ได้');
        optimize_image("$dir/$name");
        ok(['url' => "uploads/$name"]);
    }

    // ---------- view counter (public) ----------
    if ($r === 'view' && $method === 'POST') {
        $t = ($_GET['t'] ?? '') === 'service' ? 'services' : 'works';
        $vid = (int) ($_GET['id'] ?? 0);
        $pdo->prepare("UPDATE `$t` SET views = views + 1 WHERE id=?")->execute([$vid]);
        ok();
    }

    // ---------- profile ----------
    if ($r === 'profile' && $method === 'PUT') {
        update($pdo, 'profile', 1, pick(body(), ['name', 'bio', 'photo', 'footer', 'clients_intro']));
        ok();
    }

    $b = body();

    // ---------- works ----------
    if ($r === 'works') {
        $fields = ['title', 'tags', 'category', 'description', 'thumb', 'sort_order', 'cta_label', 'cta_url'];
        if (isset($b['tags']) && is_array($b['tags'])) $b['tags'] = implode(',', $b['tags']);
        if ($method === 'POST') {
            $wid = insert($pdo, 'works', pick($b, $fields));
            $ii = $pdo->prepare("INSERT INTO work_images (work_id,url,sort_order) VALUES (?,?,?)");
            for ($s = 0; $s < 3; $s++) $ii->execute([$wid, '', $s]);
            ok(['id' => $wid]);
        }
        if ($method === 'PUT') { update($pdo, 'works', $id, pick($b, $fields)); ok(); }
        if ($method === 'DELETE') { remove($pdo, 'works', $id); ok(); }
    }

    // ---------- work images ----------
    if ($r === 'work_images') {
        if ($method === 'POST') {
            $wid = (int) ($_GET['work_id'] ?? 0);
            $n = (int) $pdo->query("SELECT COUNT(*) FROM work_images WHERE work_id=$wid")->fetchColumn();
            if ($n >= 5) fail('แนบได้สูงสุด 5 ภาพ', 400);
            $iid = insert($pdo, 'work_images', ['work_id' => $wid, 'url' => $b['url'] ?? '', 'sort_order' => $n]);
            ok(['id' => $iid]);
        }
        if ($method === 'PUT') { update($pdo, 'work_images', $id, pick($b, ['url', 'sort_order'])); ok(); }
        if ($method === 'DELETE') { remove($pdo, 'work_images', $id); ok(); }
    }

    // ---------- service images ----------
    if ($r === 'service_images') {
        if ($method === 'POST') {
            $sid = (int) ($_GET['service_id'] ?? 0);
            $n = (int) $pdo->query("SELECT COUNT(*) FROM service_images WHERE service_id=$sid")->fetchColumn();
            if ($n >= 5) fail('แนบได้สูงสุด 5 ภาพ', 400);
            ok(['id' => insert($pdo, 'service_images', ['service_id' => $sid, 'url' => $b['url'] ?? '', 'sort_order' => $n])]);
        }
        if ($method === 'PUT') { update($pdo, 'service_images', $id, pick($b, ['url', 'sort_order'])); ok(); }
        if ($method === 'DELETE') { remove($pdo, 'service_images', $id); ok(); }
    }

    // ---------- services ----------
    if ($r === 'services') {
        $fields = ['icon', 'title', 'subtitle', 'sort_order'];
        if ($method === 'POST') ok(['id' => insert($pdo, 'services', pick($b, $fields))]);
        if ($method === 'PUT') { update($pdo, 'services', $id, pick($b, $fields)); ok(); }
        if ($method === 'DELETE') { remove($pdo, 'services', $id); ok(); }
    }

    // ---------- clients ----------
    if ($r === 'clients') {
        $fields = ['name', 'logo', 'sort_order'];
        if ($method === 'POST') ok(['id' => insert($pdo, 'clients', pick($b, $fields))]);
        if ($method === 'PUT') { update($pdo, 'clients', $id, pick($b, $fields)); ok(); }
        if ($method === 'DELETE') { remove($pdo, 'clients', $id); ok(); }
    }

    // ---------- experiences ----------
    if ($r === 'experiences') {
        $fields = ['title', 'period', 'summary', 'is_edu', 'sort_order'];
        if ($method === 'POST') ok(['id' => insert($pdo, 'experiences', pick($b, $fields))]);
        if ($method === 'PUT') { update($pdo, 'experiences', $id, pick($b, $fields)); ok(); }
        if ($method === 'DELETE') { remove($pdo, 'experiences', $id); ok(); }
    }

    // ---------- experience projects ----------
    if ($r === 'exp_projects') {
        if ($method === 'POST') {
            $eid = (int) ($_GET['exp_id'] ?? 0);
            ok(['id' => insert($pdo, 'experience_projects', pick($b, ['name', 'meta', 'logo', 'year', 'org', 'role', 'responsibility', 'sort_order']) + ['experience_id' => $eid])]);
        }
        if ($method === 'PUT') { update($pdo, 'experience_projects', $id, pick($b, ['name', 'meta', 'logo', 'year', 'org', 'role', 'responsibility', 'sort_order'])); ok(); }
        if ($method === 'DELETE') { remove($pdo, 'experience_projects', $id); ok(); }
    }

    // ---------- contacts ----------
    if ($r === 'contacts') {
        $fields = ['grp', 'icon', 'label', 'value', 'href', 'sort_order'];
        if ($method === 'POST') ok(['id' => insert($pdo, 'contacts', pick($b, $fields))]);
        if ($method === 'PUT') { update($pdo, 'contacts', $id, pick($b, $fields)); ok(); }
        if ($method === 'DELETE') { remove($pdo, 'contacts', $id); ok(); }
    }

    fail('ไม่พบ resource: ' . $r, 404);
} catch (Throwable $e) {
    fail($e->getMessage());
}
