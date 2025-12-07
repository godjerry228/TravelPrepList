<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// 取得 POST 資料
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['name']) || !isset($data['checklist'])) {
    echo json_encode(['success' => false, 'message' => '缺少必要參數']);
    exit;
}

$listName = trim($data['name']);
$checklist = $data['checklist'];

// 驗證檔名
if (empty($listName) || preg_match('/[\/\\\\:\*\?"<>\|]/', $listName)) {
    echo json_encode(['success' => false, 'message' => '檔名包含無效字元']);
    exit;
}

// 儲存路徑
$saveDir = __DIR__ . '/../saved-lists/';
if (!is_dir($saveDir)) {
    mkdir($saveDir, 0755, true);
}

$filename = $listName . '.json';
$filepath = $saveDir . $filename;

// 儲存檔案
$result = file_put_contents($filepath, json_encode($checklist, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

if ($result !== false) {
    echo json_encode(['success' => true, 'message' => '清單已儲存', 'filename' => $filename]);
} else {
    echo json_encode(['success' => false, 'message' => '儲存失敗']);
}
