<?php
header("Content-Type: application/json; charset=utf-8");

// 简化的API代理
$api_key = $_SERVER['VOLCANO_API_KEY'] ?? '';

// 处理非POST请求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'ready', 'message' => 'Simple proxy ready']);
    exit();
}

// 检查API密钥
if (empty($api_key)) {
    echo json_encode(['success' => false, 'error' => 'API密钥未配置']);
    exit();
}

try {
    // 获取请求数据
    $input = file_get_contents("php://input");
    if (empty($input)) {
        throw new Exception('请求体为空');
    }
    
    $data = json_decode($input, true);
    if (!$data) {
        throw new Exception('JSON解析失败');
    }

    $message = $data['message'] ?? '';
    if (empty($message)) {
        throw new Exception('消息内容为空');
    }

    // 构建API请求
    $api_url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    $payload = [
        'model' => 'deepseek-v3-250324',
        'messages' => [
            ['role' => 'user', 'content' => $message]
        ],
        'stream' => false
    ];

    // 发送请求
    $ch = curl_init($api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $api_key
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("API返回错误: $httpCode");
    }

    $responseData = json_decode($response, true);
    $reply = $responseData['choices'][0]['message']['content'] ?? '无法获取回复';

    echo json_encode(['success' => true, 'response' => $reply]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>