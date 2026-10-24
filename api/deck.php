<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Send the prompt with POST.']);
    exit;
}

$secretsPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'secrets.php';
if (!is_file($secretsPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Missing config/secrets.php. Copy secrets.example.php and add an OpenAI key.']);
    exit;
}

/** @var mixed $secrets */
$secrets = require $secretsPath;
$key = is_array($secrets) ? (string) ($secrets['openai_key'] ?? '') : '';
$model = is_array($secrets) && !empty($secrets['openai_model']) ? (string) $secrets['openai_model'] : 'gpt-4.1-mini';

if ($key === '' || str_starts_with($key, 'sk-your-')) {
    http_response_code(500);
    echo json_encode(['error' => 'The OpenAI key is not set in config/secrets.php.']);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'PHP curl is not enabled.']);
    exit;
}

$body = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'The request was not JSON.']);
    exit;
}

$prompt = trim((string) ($body['prompt'] ?? ''));
$sheets = (int) ($body['sheets'] ?? 6);
if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Write what the talk is about.']);
    exit;
}
if (strlen($prompt) > 1500) {
    $prompt = substr($prompt, 0, 1500);
}
$sheets = max(3, min(8, $sheets));

$system = <<<'PROMPT'
You compose short talks for a hand-drawn folio. Each sheet is one thing a person can say while a room looks at it.
Return a JSON object with exactly this shape:
{
  "title": "string",
  "sheets": [
    {
      "role": "open" or "points" or "pair" or "close",
      "kicker": "2 to 4 words, or empty",
      "heading": "one short line",
      "lines": ["short spoken lines"],
      "aside": "only when role is pair, otherwise empty",
      "note": "one sentence the speaker can say"
    }
  ]
}
Rules:
- The first sheet role is open. The last sheet role is close. Use pair at most once.
- Write the way a person talks. No markdown, no bullet characters, no hashtags, no emoji.
- Headings are short. Lines are fragments a listener can read while someone speaks.
- At most 5 lines on a sheet. At most 12 words in a line.
- Stay with the subject. Do not add a sales pitch for yourself.
PROMPT;

$user = "Sheets: {$sheets}\nSubject: {$prompt}";

$models = [];
foreach ([$model, 'gpt-4.1-mini', 'gpt-4o-mini'] as $candidate) {
    if (!in_array($candidate, $models, true)) {
        $models[] = $candidate;
    }
}

$decoded = null;
$status = 0;
$message = 'OpenAI refused the request.';
foreach ($models as $candidate) {
    $payload = json_encode([
        'model' => $candidate,
        'temperature' => 0.6,
        'response_format' => ['type' => 'json_object'],
        'messages' => [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $user],
        ],
    ], JSON_UNESCAPED_UNICODE);

    $handle = curl_init('https://api.openai.com/v1/chat/completions');
    $options = [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 28,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $key,
        ],
        CURLOPT_POSTFIELDS => $payload,
    ];
    $caBundle = 'C:/xampp/apache/bin/curl-ca-bundle.crt';
    if (is_file($caBundle)) {
        $options[CURLOPT_CAINFO] = $caBundle;
    }
    curl_setopt_array($handle, $options);
    $response = curl_exec($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
    curl_close($handle);

    if ($response === false || $status === 0) {
        http_response_code(502);
        echo json_encode(['error' => 'Could not reach OpenAI.']);
        exit;
    }

    $decoded = json_decode($response, true);
    if ($status < 400) {
        break;
    }

    $message = is_array($decoded) ? (string) ($decoded['error']['message'] ?? '') : '';
    if ($status === 401) {
        http_response_code(502);
        echo json_encode(['error' => 'The OpenAI key was refused. Put a current key in config/secrets.php.']);
        exit;
    }
    $missingModel = $status === 404 || stripos($message, 'model') !== false;
    if (!$missingModel) {
        break;
    }
}

if ($status >= 400) {
    http_response_code(502);
    echo json_encode(['error' => $message !== '' ? $message : 'OpenAI refused the request.']);
    exit;
}

$content = $decoded['choices'][0]['message']['content'] ?? '';
$talk = json_decode((string) $content, true);
if (!is_array($talk) && preg_match('/\{.*\}/s', (string) $content, $match)) {
    $talk = json_decode($match[0], true);
}
if (!is_array($talk)) {
    http_response_code(502);
    echo json_encode(['error' => 'The model did not return a talk.']);
    exit;
}

echo json_encode(['talk' => $talk], JSON_UNESCAPED_UNICODE);
