<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="{{ csrf_token() }}"><title>{{ $title }} · Resona</title><link rel="icon" href="/resona.svg" type="image/svg+xml"><link rel="stylesheet" href="/resona.css"><script src="/resona.js" defer></script></head>
<body>
<a class="skip" href="#content">Pular para o conteúdo</a>
<aside class="sidebar">
    <a class="brand" href="{{ route('home') }}"><img src="/resona.svg" width="36" height="36" alt="">resona<span>●</span></a>
    <p class="eyebrow">SEU ESPAÇO SONORO</p>
    <nav aria-label="Navegação principal">
        @foreach(['home' => ['⌂', 'Início'], 'search' => ['⌕', 'Busca'], 'library' => ['▤', 'Biblioteca']] as $name => [$icon, $label])
        <a href="{{ route($name) }}" @if($page === $name) aria-current="page" @endif><span aria-hidden="true">{{ $icon }}</span>{{ $label }}</a>
        @endforeach
    </nav>
    <div class="sidebar-note"><span class="tiny-orbit">◉</span><strong>Um lugar para descobrir.</strong><p>Explore nosso catálogo de demonstração e guarde seus encontros favoritos.</p><a href="{{ route('search') }}">Encontrar música ↗</a></div>
    <div class="sidebar-bottom">RESONA / LOCAL EDITION<small>Feito para ouvir com calma.</small></div>
</aside>
<div class="workspace">
    <header class="topbar"><span class="muted">Sua música, em outra frequência.</span><span class="edition">CATÁLOGO DEMO <i></i></span></header>
    <main id="content" tabindex="-1">
    @if($page === 'home')
        <section class="hero"><div><p class="eyebrow">DESCUBRA NOVAS FREQUÊNCIAS</p><h1>Deixe o mundo<br>ressoar.</h1><p>Novos sons. Outras paisagens.<br>Encontre algo que fique com você.</p><a class="primary" href="{{ route('search') }}">Explorar o catálogo <span>↗</span></a></div><div class="hero-art" aria-hidden="true"><i></i><i></i><i></i><span>r.</span></div><span class="hero-caption">SINTONIZE COM O AGORA / 001</span></section>
        <section><div class="section-head"><div><p class="eyebrow">ESCOLHAS RESONA</p><h2>Álbuns para se perder</h2></div><a href="{{ route('search', ['q' => '', 'type' => 'albums']) }}">Explorar ↗</a></div><div class="cards">@foreach($catalog['albums'] as $item)<x-album-card :album="$item" :catalog="$catalog" />@endforeach</div></section>
        <section><div class="section-head"><h2>Encontre sua próxima faixa</h2><span class="muted">Um ponto de partida</span></div><x-tracks :tracks="$tracks" :saved="$saved" /></section>
    @elseif($page === 'search')
        <p class="eyebrow">SIGA SUA CURIOSIDADE</p><h1>Busca</h1>
        <form class="search-form" action="{{ route('search') }}" role="search"><label class="sr-only" for="q">Faixas, artistas ou álbuns</label><input id="q" name="q" value="{{ $query }}" maxlength="200" placeholder="Faixas, artistas ou álbuns" autocomplete="off"><input type="hidden" name="type" value="{{ $type }}"><button class="primary">Buscar ↗</button></form>
        <nav class="chips" aria-label="Categorias da busca">@foreach(['all' => 'Tudo', 'tracks' => 'Faixas', 'artists' => 'Artistas', 'albums' => 'Álbuns'] as $key => $label)<a href="{{ route('search', ['q' => $query, 'type' => $key]) }}" @if($type === $key) aria-current="page" @endif>{{ $label }}</a>@endforeach</nav>
        @if(trim($query) === '')
            <h2>Comece por uma descoberta</h2><p class="muted">Busque um nome ou explore os artistas e álbuns do Resona.</p>
            @if(in_array($type, ['all', 'albums']))<div class="cards">@foreach($catalog['albums'] as $item)<x-album-card :album="$item" :catalog="$catalog" />@endforeach</div>@endif
            @if(in_array($type, ['all', 'artists']))<h2>Artistas</h2><div class="cards">@foreach($catalog['artists'] as $item)<x-artist-card :artist="$item" />@endforeach</div>@endif
        @else
            <p class="muted">Resultados para “{{ $query }}”</p>
            @if(($type === 'all' && !array_filter($results)) || ($type !== 'all' && !$results[$type]))<div class="empty"><span>⌕</span><h2>Nenhum encontro por aqui</h2><p>Tente outro nome de faixa, artista ou álbum.</p><a href="{{ route('search') }}">Limpar busca</a></div>@endif
            @if(in_array($type, ['all', 'tracks']) && $results['tracks'])<h2>Faixas</h2><x-tracks :tracks="$results['tracks']" :saved="$saved" />@endif
            @if(in_array($type, ['all', 'artists']) && $results['artists'])<h2>Artistas</h2><div class="cards">@foreach($results['artists'] as $item)<x-artist-card :artist="$item" />@endforeach</div>@endif
            @if(in_array($type, ['all', 'albums']) && $results['albums'])<h2>Álbuns</h2><div class="cards">@foreach($results['albums'] as $item)<x-album-card :album="$item" :catalog="$catalog" />@endforeach</div>@endif
        @endif
    @elseif($page === 'library')
        <p class="eyebrow">ENCONTROS QUE FICAM</p><h1>Sua biblioteca</h1><p class="muted">As faixas que você guardou. Sempre por perto.</p>
        <form class="search-form" action="{{ route('library') }}"><label class="sr-only" for="q">Filtrar biblioteca</label><input id="q" name="q" value="{{ $query }}" maxlength="200" placeholder="Filtrar por faixa ou artista"><label class="sr-only" for="sort">Ordenar por</label><select id="sort" name="sort">@foreach(['name' => 'Título', 'artist' => 'Artista', 'album' => 'Álbum'] as $key => $label)<option value="{{ $key }}" @selected($sort === $key)>{{ $label }}</option>@endforeach</select><button class="primary">Aplicar</button></form>
        @if($tracks->isEmpty())<div class="empty"><span>♡</span><h2>{{ $saved ? 'Nenhuma faixa para este filtro' : 'Sua coleção começa com um encontro' }}</h2><p>Toque no coração ao lado de uma faixa para guardá-la aqui.</p><a class="primary" href="{{ route('search') }}">Descobrir músicas ↗</a></div>@else<x-tracks :tracks="$tracks" :saved="$saved" />@endif
    @elseif($page === 'album')
        <section class="detail-hero"><div class="cover" style="--art: {{ $album['color'] }}"><span class="orbit"></span><span class="cover-word">{{ $album['name'] }}</span></div><div><p class="eyebrow">ÁLBUM / {{ $album['genre'] }}</p><h1>{{ $album['name'] }}</h1><p><a href="{{ route('artist', $artist['id']) }}">{{ $artist['name'] }}</a> · {{ $album['year'] }} · {{ $tracks->count() }} faixas</p></div></section><x-tracks :tracks="$tracks" :saved="$saved" /><p class="muted">Um lançamento fictício do catálogo Resona.</p><a class="text-link" href="{{ route('artist', $artist['id']) }}">Mais de {{ $artist['name'] }} ↗</a>
    @elseif($page === 'artist')
        <section class="detail-hero"><div class="portrait" style="--art: {{ $artist['color'] }}"><span>{{ $artist['initials'] }}</span></div><div><p class="eyebrow">ARTISTA</p><h1>{{ $artist['name'] }}</h1><p>{{ $artist['bio'] }}</p></div></section><h2>Faixas</h2><x-tracks :tracks="$tracks" :saved="$saved" /><h2>Discografia</h2><div class="cards">@foreach($artistAlbums as $item)<x-album-card :album="$item" :catalog="$catalog" />@endforeach</div>
    @elseif($page === 'track')
        <p class="eyebrow">FAIXA / CATÁLOGO RESONA</p><h1>{{ $track['name'] }}</h1><p class="muted"><a href="{{ route('artist', $track['artist_id']) }}">{{ $track['artist']['name'] }}</a> · <a href="{{ route('album', $track['album_id']) }}">{{ $track['album']['name'] }}</a></p><x-tracks :tracks="$tracks" :saved="$saved" /><div class="local-audio"><h2>Ouça um arquivo seu</h2><p class="muted">Estas faixas são fictícias. Selecione um arquivo de áudio local para ouvir no Resona.</p><label class="primary file-label">Escolher áudio<input type="file" id="audio-file" accept="audio/*"></label></div>
    @endif
    <footer class="page-footer">SONS QUE ENCONTRAM VOCÊ.<span>Resona © {{ date('Y') }} · Catálogo fictício</span></footer>
    </main>
</div>
<section class="player" aria-label="Player de arquivos locais"><div><span class="player-mark">◉</span><strong id="audio-name">Sua próxima frequência</strong><small id="audio-status">Escolha um áudio local para ouvir</small></div><audio id="audio" controls preload="metadata"></audio><label class="file-shortcut" title="Abrir áudio local">Abrir áudio<input id="audio-file-footer" type="file" accept="audio/*"></label></section>
<div id="notice" role="status" aria-live="polite"></div>
</body></html>
