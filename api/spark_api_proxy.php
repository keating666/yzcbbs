<?php
// =================================================================
// Spark API Proxy - v2.1
// Author: Gemini
// Last Modified: 2025-06-13
// =================================================================

header("Content-Type: application/json; charset=utf-8");

// --- 环境与错误处理 ---
ini_set('display_errors', 0); // 生产环境建议关闭页面错误显示
error_reporting(E_ALL);
$debug_mode = false; // 设置为 true 会将日志写入Nginx错误日志

// --- 性能优化配置 ---
$max_retries = 1; // 最大重试次数（减少到1次）
$cache_enabled = false; // 是否启用缓存（简单场景下关闭）
$rate_limit_enabled = true; // 是否启用频率限制
$max_requests_per_minute = 15; // 每分钟最大请求数（降低到15）
$max_requests_per_hour = 100; // 每小时最大请求数
$blocked_ips = []; // 可以添加需要屏蔽的IP地址

// 调试日志函数
function debug_log($message, $data = null) {
    global $debug_mode;
    if ($debug_mode) {
        $timestamp = date('Y-m-d H:i:s');
        $log_entry = "[$timestamp] $message";
        if ($data !== null) {
            $log_entry .= " | Data: " . json_encode($data, JSON_UNESCAPED_UNICODE);
        }
        error_log($log_entry);
    }
}

// --- 火山引擎 API 配置 ---
// 安全的方式：只从环境变量获取API密钥
$api_key = $_SERVER['VOLCANO_API_KEY'] ?? getenv('VOLCANO_API_KEY') ?? '';

$api_url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
$model = 'deepseek-v3-250324'; // 更换为deepseek模型

debug_log("=== Volcano Engine API请求开始 ===");

// 验证API密钥格式
if (!empty($api_key) && !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/', $api_key)) {
    debug_log("CRITICAL: API密钥格式错误");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'API密钥格式错误，请检查配置。']);
    exit();
}

// 优雅地处理非POST请求 (例如浏览器发送的HEAD预检请求)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(200);
    echo json_encode(['status' => 'ready', 'message' => 'Endpoint is ready to accept POST requests.']);
    exit();
}

// 增强的频率限制检查
function checkRateLimit() {
    global $rate_limit_enabled, $max_requests_per_minute, $max_requests_per_hour, $blocked_ips;
    
    if (!$rate_limit_enabled) return ['allowed' => true];
    
    $client_ip = $_SERVER['REMOTE_ADDR'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['HTTP_X_REAL_IP'] ?? 'unknown';
    
    // 检查IP是否被屏蔽
    if (in_array($client_ip, $blocked_ips)) {
        return ['allowed' => false, 'reason' => 'IP地址已被屏蔽'];
    }
    
    $rate_file = sys_get_temp_dir() . '/ai_rate_' . md5($client_ip);
    $current_time = time();
    
    // 读取当前请求记录
    $requests = [];
    if (file_exists($rate_file)) {
        $requests = json_decode(file_get_contents($rate_file), true) ?: [];
    }
    
    // 清理过期记录（分钟级和小时级）
    $recent_requests = array_filter($requests, function($timestamp) use ($current_time) {
        return ($current_time - $timestamp) < 60; // 1分钟内
    });
    
    $hourly_requests = array_filter($requests, function($timestamp) use ($current_time) {
        return ($current_time - $timestamp) < 3600; // 1小时内
    });
    
    // 检查分钟级限制
    if (count($recent_requests) >= $max_requests_per_minute) {
        return ['allowed' => false, 'reason' => '每分钟请求次数过多，请稍后再试'];
    }
    
    // 检查小时级限制
    if (count($hourly_requests) >= $max_requests_per_hour) {
        return ['allowed' => false, 'reason' => '每小时请求次数已达上限，请稍后再试'];
    }
    
    // 记录当前请求
    $hourly_requests[] = $current_time;
    
    // 只保留最近1小时的记录
    $hourly_requests = array_filter($hourly_requests, function($timestamp) use ($current_time) {
        return ($current_time - $timestamp) < 3600;
    });
    
    file_put_contents($rate_file, json_encode(array_values($hourly_requests)));
    
    return ['allowed' => true];
}

// 执行频率限制检查
$rate_check = checkRateLimit();
if (!$rate_check['allowed']) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => $rate_check['reason']]);
    exit();
}

// 检查API密钥是否存在
if (empty($api_key)) {
    debug_log("CRITICAL: 服务器环境变量 VOLCANO_API_KEY 未配置或为空。");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => '服务器内部错误：API密钥未配置。']);
    exit();
}

debug_log("API配置", [
    'api_url' => $api_url,
    'model' => $model,
    'api_key_prefix' => substr($api_key, 0, 8) . '...'
]);

// ================== 主逻辑 ==================
try {
    // 获取前端传入的 JSON 数据
    $requestBody = file_get_contents("php://input");
    if (empty($requestBody)) {
        throw new Exception('请求体为空');
    }
    $data = json_decode($requestBody, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON解析错误: ' . json_last_error_msg());
    }

    // 输入验证和过滤
    $message = trim($data['message']);
    $history = isset($data['history']) && is_array($data['history']) ? $data['history'] : [];
    
    // 验证消息长度
    if (strlen($message) > 2000) {
        throw new Exception('消息内容过长，请控制在2000字符以内。');
    }
    
    if (empty($message)) {
        throw new Exception('消息内容不能为空。');
    }
    
    // 内容安全过滤
    $blocked_patterns = [
        '/\b(密钥|密码|token|key|secret)\b/i',
        '/\b(hack|attack|exploit|injection)\b/i',
        '/\b(admin|root|superuser)\b/i'
    ];
    
    foreach ($blocked_patterns as $pattern) {
        if (preg_match($pattern, $message)) {
            throw new Exception('消息包含敏感内容，请重新输入。');
        }
    }
    
    // 验证历史记录长度和内容
    if (count($history) > 20) {
        $history = array_slice($history, -20); // 只保留最近20条
    }
    
    // 过滤HTML标签
    $message = strip_tags($message);
    $message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    
    // 构建消息数组
    $messages = [];
    foreach ($history as $item) {
        if (isset($item['role']) && isset($item['content'])) {
            $messages[] = ['role' => $item['role'], 'content' => $item['content']];
        }
    }
    $messages[] = ['role' => 'user', 'content' => $message];
    
    // 构造API请求参数
    $requestPayload = [
        'model' => $model,
        'messages' => $messages,
        'stream' => false
    ];
    $payload = json_encode($requestPayload, JSON_UNESCAPED_UNICODE);
    
    // 带重试机制的API请求函数
    function makeApiRequestWithRetry($api_url, $payload, $api_key, $max_retries) {
        $last_error = null;
        $response = '';
        
        for ($attempt = 1; $attempt <= $max_retries; $attempt++) {
            debug_log("API请求尝试", ['attempt' => $attempt, 'max_retries' => $max_retries]);
            
            $ch = curl_init($api_url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json; charset=utf-8',
                'Authorization: Bearer ' . $api_key
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15); // 缩短超时时间
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);
            
            // 如果成功，直接返回
            if (!$curlError && $httpCode >= 200 && $httpCode < 400) {
                debug_log("API请求成功", ['attempt' => $attempt, 'http_code' => $httpCode]);
                return ['success' => true, 'response' => $response, 'http_code' => $httpCode];
            }
            
            // 记录错误
            $error_msg = $curlError ?: "HTTP错误: $httpCode";
            $last_error = $error_msg;
            debug_log("API请求失败", ['attempt' => $attempt, 'error' => $error_msg]);
            
            // 如果不是最后一次尝试，等待后重试
            if ($attempt < $max_retries) {
                $wait_time = 1; // 快速重试，只等1秒
                debug_log("等待重试", ['wait_seconds' => $wait_time]);
                sleep($wait_time);
            }
        }
        
        return ['success' => false, 'error' => $last_error, 'response' => $response];
    }
    
    // 执行带重试的API请求
    $api_result = makeApiRequestWithRetry($api_url, $payload, $api_key, $max_retries);
    
    if (!$api_result['success']) {
        throw new Exception('API请求失败: ' . $api_result['error']);
    }
    
    $response = $api_result['response'];
    $httpCode = $api_result['http_code'];
    
    $responseData = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('API响应JSON解析失败');
    }
    
    $reply = $responseData['choices'][0]['message']['content'] ?? '抱歉，未能获取到有效回复。';
    
    // 返回成功响应
    echo json_encode(['success' => true, 'response' => $reply]);

} catch (Exception $e) {
    debug_log("=== 异常发生 ===", [
        'error_message' => $e->getMessage(),
        'error_file' => $e->getFile(),
        'error_line' => $e->getLine()
    ]);
    // 向前端返回一个统一的错误格式
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => '服务器处理请求时发生错误。技术原因: ' . $e->getMessage()]);
} 