<?php
// PDO connection (คืนค่า $pdo). ใช้ร่วมกันทุกไฟล์
function db(bool $withDb = true): PDO {
    static $conns = [];
    $key = $withDb ? 'db' : 'nodb';
    if (isset($conns[$key])) return $conns[$key];
    $c = require __DIR__ . '/config.php';
    $dsn = "mysql:host={$c['host']};port={$c['port']};charset=utf8mb4";
    if ($withDb) $dsn .= ";dbname={$c['name']}";
    $pdo = new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $conns[$key] = $pdo;
}
