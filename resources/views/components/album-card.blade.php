@props(['album', 'catalog'])
@php($artist = collect($catalog['artists'])->firstWhere('id', $album['artist_id']))
<article class="card">
    <a href="{{ route('album', $album['id']) }}" class="cover" style="--art: {{ $album['color'] }}" aria-label="Abrir álbum {{ $album['name'] }}"><span class="orbit"></span><span class="cover-word">{{ $album['name'] }}</span></a>
    <a class="card-title" href="{{ route('album', $album['id']) }}">{{ $album['name'] }}</a>
    <a class="muted" href="{{ route('artist', $artist['id']) }}">{{ $artist['name'] }}</a>
    <small>{{ $album['year'] }} · {{ $album['genre'] }}</small>
</article>
