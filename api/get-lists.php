<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$saveDir = __DIR__ . '/../saved-lists/';

// 確認資料夾存在
if (!is_dir($saveDir)) {
    echo json_encode(['success' => true, 'lists' => []]);
    exit;
}

// 讀取所有 JSON 檔案
$files = glob($saveDir . '*.json');
$lists = [];

foreach ($files as $file) {
    $filename = basename($file);
    $name = pathinfo($filename, PATHINFO_FILENAME);
    $lists[] = [
        'name' => $name,
        'filename' => $filename,
        'modified' => filemtime($file)
    ];
}

// 按修改時間排序（最新的在前面）
usort($lists, function($a, $b) {
    return $b['modified'] - $a['modified'];
});

echo json_encode(['success' => true, 'lists' => $lists]);
