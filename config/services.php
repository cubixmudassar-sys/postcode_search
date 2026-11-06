<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'lookup' => [
        'base_url' => env('LOOKUP_API_BASE_URL', 'https://lookup.qmaily.com/api'),
        'timeout' => (int) env('LOOKUP_API_TIMEOUT', 15),
    ],

    'canadapost' => [
        'key' => env('CANADA_POST_ADDRESSCOMPLETE_KEY'),
        'timeout' => (int) env('CANADA_POST_ADDRESSCOMPLETE_TIMEOUT', 15),
        // Must match a URL allowed on the AddressComplete key (localhost is often blocked).
        'referer' => env('CANADA_POST_REFERER'),
        // Local uses HTTP; non-local uses HTTPS. Explicit env URLs still win.
        'find_url' => env(
            'CANADA_POST_FIND_URL',
            (env('APP_ENV', 'production') === 'local' ? 'http' : 'https')
            . '://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3.ws'
        ),
        'retrieve_url' => env(
            'CANADA_POST_RETRIEVE_URL',
            (env('APP_ENV', 'production') === 'local' ? 'http' : 'https')
            . '://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Retrieve/v2.11/json3.ws'
        ),
    ],

];
