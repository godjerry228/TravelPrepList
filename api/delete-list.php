<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// 取得 POST 資料
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!isset($data['filename'])) {
    echo json_encode(['success' => false, 'message' => '缺少檔案名稱']);
    exit;
}

$filename = $data['filename'];

// 驗證檔名
if (preg_match('/[\/\\:\*\?"<>\|]/', $filename) || !preg_match('/\.json$/', $filename)) {
    echo json_encode(['success' => false, 'message' => '無效的檔案名稱']);
    exit;
}

$filepath = __DIR__ . '/../saved-lists/' . $filename;

// 檢查檔案是否存在
if (!file_exists($filepath)) {
    echo json_encode(['success' => false, 'message' => '檔案不存在']);
    exit;
}

// 刪除檔案
if (unlink($filepath)) {
    echo json_encode(['success' => true, 'message' => '清單已刪除']);
} else {
    echo json_encode(['success' => false, 'message' => '刪除失敗']);
}
