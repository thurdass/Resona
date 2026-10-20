<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'">
    <title>Resona · Sua coleção</title><link rel="icon" href="/resona.svg"><link rel="stylesheet" href="/resona.css"><script type="module" src="/resona.js"></script>
</head>
<body>
<a class="skip" href="#content">Pular para a coleção</a>
<aside class="sidebar">
    <a class="brand" href="#library"><img src="/resona.svg" width="32" height="32" alt="">resona</a>
    <nav aria-label="Sua música">
        <a href="#library" data-view="library">Coleção</a><a href="#favorites" data-view="favorites">Favoritos</a><a href="#albums" data-view="albums">Álbuns</a><a href="#artists" data-view="artists">Artistas</a>
    </nav>
    <div class="playlist-heading"><h2>Playlists</h2><button id="new-playlist" aria-label="Criar playlist">＋</button></div>
    <nav id="playlists" aria-label="Playlists"></nav>
    <div class="sidebar-bottom"><p>Seu acervo.<br>No seu ritmo.</p><button id="shortcuts">Atalhos de teclado</button></div>
</aside>
<div class="workspace">
    <header class="topbar"><p>Uma coleção para ouvir de perto.</p><div class="import-actions"><button id="import-folder">Importar pasta</button><button class="primary" id="import-files">Abrir músicas</button></div></header>
    <main id="content" tabindex="-1">
        <div class="collection-heading"><div><h1 id="view-title">Sua coleção</h1><p id="collection-count">Carregando sua biblioteca…</p></div><button id="queue-toggle" aria-expanded="true" aria-controls="queue-panel">Fila <span id="queue-count">0</span></button></div>
        <div class="tools"><label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" maxlength="200" placeholder="Buscar faixa, artista ou álbum" aria-label="Buscar na coleção"></label><label class="sort">Ordenar <select id="sort"><option value="title">Título</option><option value="artist">Artista</option><option value="album">Álbum</option></select></label></div>
        <div id="view-actions"></div><div id="collection"></div>
        <p class="drop-hint">Arraste arquivos de áudio para adicionar à coleção. Os originais ficam onde estão.</p>
    </main>
</div>
<aside id="queue-panel" class="queue-panel" aria-label="Fila de reprodução"><div class="queue-heading"><h2>Na sequência</h2><button id="clear-queue">Limpar</button><button id="queue-close" aria-label="Fechar fila">×</button></div><p class="muted">A próxima música é sua escolha.</p><ol id="queue"></ol></aside>
<footer class="player" aria-label="Reprodução">
    <div class="now-playing"><div id="now-cover" class="cover small-cover" aria-hidden="true">♪</div><div><strong id="audio-name">Escolha sua primeira música</strong><span id="audio-artist">Tudo começa na sua coleção.</span></div></div>
    <div class="transport"><div class="transport-buttons"><button id="shuffle" aria-label="Reprodução aleatória" aria-pressed="false">⤨</button><button id="previous" aria-label="Faixa anterior">⏮</button><button id="play" class="play" aria-label="Reproduzir">▶</button><button id="next" aria-label="Próxima faixa">⏭</button><button id="repeat" aria-label="Repetição: desligada" aria-pressed="false">↻</button></div><div class="timeline"><span id="elapsed">0:00</span><input id="seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="Posição da reprodução"><span id="duration">0:00</span></div></div>
    <label class="volume">Volume<input id="volume" type="range" min="0" max="1" step="0.01" value="0.8"></label>
    <audio id="audio" preload="metadata"></audio>
</footer>
<div id="notice" role="status" aria-live="polite"></div>
<dialog id="playlist-dialog"><form id="playlist-form"><h2>Nova playlist</h2><label>Nome<input id="playlist-name" maxlength="120" required autocomplete="off"></label><div class="dialog-actions"><button type="button" id="cancel-playlist">Cancelar</button><button class="primary">Criar playlist</button></div></form></dialog>
<dialog id="shortcuts-dialog"><h2>Seu teclado também toca</h2><dl><dt>Espaço</dt><dd>Reproduzir ou pausar</dd><dt>Alt + → / ←</dt><dd>Próxima / anterior</dd><dt>→ / ←</dt><dd>Avançar / voltar 5 segundos</dd><dt>↑ / ↓</dt><dd>Ajustar volume</dd><dt>Ctrl + O</dt><dd>Abrir músicas</dd></dl><p>Atalhos de reprodução ficam inativos ao digitar.</p><form method="dialog"><button>Fechar</button></form></dialog>
</body></html>
