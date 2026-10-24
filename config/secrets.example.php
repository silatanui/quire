<?php
/**
 * Copy this file to config/secrets.php and put your own key there.
 * secrets.php is gitignored and is not part of the cPanel copy.
 * Visiting this file in a browser does nothing useful; deck.php reads it.
 */
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(404);
    exit;
}

return [
    'openai_key' => 'sk-your-key-here',
    'openai_model' => 'gpt-4.1-mini',
];
