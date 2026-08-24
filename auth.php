<?php
// HTTP Basic Auth guard สำหรับหน้า admin และ API ที่แก้ไขข้อมูล
// อ่าน user/รหัสจาก config.php (admin_user / admin_pass)

function basic_creds(): array {
    // รองรับหลายสภาพแวดล้อม (Apache module / CGI / nginx+FPM)
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$h && function_exists('apache_request_headers')) {
        $hs = apache_request_headers();
        $h = $hs['Authorization'] ?? $hs['authorization'] ?? '';
    }
    if ($h && preg_match('/Basic\s+(.+)/i', $h, $m)) {
        $dec = base64_decode($m[1]);
        if ($dec !== false && strpos($dec, ':') !== false) {
            return explode(':', $dec, 2);
        }
    }
    if (isset($_SERVER['PHP_AUTH_USER'])) {
        return [$_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW'] ?? ''];
    }
    return [null, null];
}

function admin_guard(): void {
    $cfg = require __DIR__ . '/config.php';
    $user = $cfg['admin_user'] ?? 'admin';
    $pass = $cfg['admin_pass'] ?? '';

    // ยังไม่ได้ตั้งรหัส = ล็อกไว้ก่อน (กันเผลอเปิด admin สาธารณะ)
    if ($pass === '') {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        exit('ยังไม่ได้ตั้งรหัสผ่าน admin — เปิด config.php แล้วตั้งค่า admin_pass ก่อนใช้งาน');
    }

    [$gu, $gp] = basic_creds();
    $okUser = is_string($gu) && hash_equals($user, $gu);
    $okPass = is_string($gp) && hash_equals($pass, $gp);
    if (!$okUser || !$okPass) {
        header('WWW-Authenticate: Basic realm="Maywipa Admin"');
        http_response_code(401);
        header('Content-Type: text/plain; charset=utf-8');
        exit('ต้องยืนยันตัวตนก่อนเข้าจัดการหลังบ้าน');
    }
}
