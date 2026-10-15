<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Blocked leaderboard words
    |--------------------------------------------------------------------------
    |
    | Substrings refused in leaderboard names, after lower-casing and folding
    | look-alike characters. Keep entries short and unambiguous: a word that
    | also occurs inside ordinary names (e.g. "ass" in "Cassandra") will
    | block those names too, so prefer longer forms.
    |
    */

    'blocked_words' => [
        'fuck', 'shit', 'cunt', 'bitch', 'nigger', 'nigga', 'faggot', 'retard',
        'whore', 'slut', 'wanker', 'twat', 'dickhead', 'asshole', 'arsehole',
        'hitler', 'nazi', 'rapist',
    ],
];
