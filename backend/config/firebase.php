<?php

return [
    'credentials' => [
        'file' => env('FIREBASE_CREDENTIALS'),
    ],
    'firestore' => [
        'database' => env('FIREBASE_FIRESTORE_DATABASE'),
        // 'transport' => 'rest',
    ],
];