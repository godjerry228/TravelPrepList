<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// 取得 GET 參數
$filename = isset($_GET['filename']) ? $_GET['filename'] : '';

if (empty($filename)) {
    echo json_encode(['success' => false, 'message' => '缺少檔案名稱']);
    exit;
}

// 驗證檔名
if (preg_match('/[\/\\\\:\*\?"<>\|]/', $filename) || !preg_match('/\.json$/', $filename)) {
    echo json_encode(['success' => false, 'message' => '無效的檔案名稱']);
    exit;
}

$filepath = __DIR__ . '/../saved-lists/' . $filename;

// 檢查檔案是否存在
if (!file_exists($filepath)) {
    echo json_encode(['success' => false, 'message' => '檔案不存在']);
    exit;
}

// 讀取檔案
$content = file_get_contents($filepath);
$checklist = json_decode($content, true);

if ($checklist === null) {
    echo json_encode(['success' => false, 'message' => '檔案格式錯誤']);
    exit;
}

echo json_encode(['success' => true, 'checklist' => $checklist]);
