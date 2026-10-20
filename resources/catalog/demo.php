<?php

// Catálogo fictício e autoral; nenhum recurso do Spotify é distribuído.
return [
    'artists' => [
        ['id' => 'aurora', 'name' => 'Aurora Norte', 'color' => '#ac84ef', 'bio' => 'Sintetizadores, paisagens abertas e canções para atravessar a noite.', 'initials' => 'AN'],
        ['id' => 'mare', 'name' => 'Maré Baixa', 'color' => '#64c8bd', 'bio' => 'Um encontro entre o litoral, o jazz e a música eletrônica brasileira.', 'initials' => 'MB'],
        ['id' => 'orbita', 'name' => 'Órbita', 'color' => '#eeae74', 'bio' => 'Texturas instrumentais e pequenos movimentos em torno do silêncio.', 'initials' => 'Ó'],
    ],
    'albums' => [
        ['id' => 'entre-luzes', 'name' => 'Entre Luzes', 'artist_id' => 'aurora', 'year' => 2026, 'color' => '#ac84ef', 'genre' => 'Eletrônica'],
        ['id' => 'oceanos', 'name' => 'Oceanos de Dentro', 'artist_id' => 'mare', 'year' => 2025, 'color' => '#64c8bd', 'genre' => 'Jazz'],
        ['id' => 'gravidade', 'name' => 'Gravidade Leve', 'artist_id' => 'orbita', 'year' => 2026, 'color' => '#eeae74', 'genre' => 'Ambient'],
    ],
    'tracks' => [
        ['id' => 'primeira-luz', 'name' => 'Primeira Luz', 'artist_id' => 'aurora', 'album_id' => 'entre-luzes', 'duration' => 184, 'number' => 1],
        ['id' => 'cidade-acesa', 'name' => 'Cidade Acesa', 'artist_id' => 'aurora', 'album_id' => 'entre-luzes', 'duration' => 212, 'number' => 2],
        ['id' => 'depois-da-chuva', 'name' => 'Depois da Chuva', 'artist_id' => 'aurora', 'album_id' => 'entre-luzes', 'duration' => 198, 'number' => 3],
        ['id' => 'sal', 'name' => 'Sal', 'artist_id' => 'mare', 'album_id' => 'oceanos', 'duration' => 236, 'number' => 1],
        ['id' => 'correnteza', 'name' => 'Correnteza', 'artist_id' => 'mare', 'album_id' => 'oceanos', 'duration' => 204, 'number' => 2],
        ['id' => 'horizonte', 'name' => 'Horizonte', 'artist_id' => 'mare', 'album_id' => 'oceanos', 'duration' => 261, 'number' => 3],
        ['id' => 'satelite', 'name' => 'Satélite', 'artist_id' => 'orbita', 'album_id' => 'gravidade', 'duration' => 178, 'number' => 1],
        ['id' => 'sem-peso', 'name' => 'Sem Peso', 'artist_id' => 'orbita', 'album_id' => 'gravidade', 'duration' => 225, 'number' => 2],
        ['id' => 'volta', 'name' => 'Volta', 'artist_id' => 'orbita', 'album_id' => 'gravidade', 'duration' => 193, 'number' => 3],
    ],
];
