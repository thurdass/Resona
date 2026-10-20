@props(['artist'])
<a class="card artist-card" href="{{ route('artist', $artist['id']) }}">
    <div class="portrait" style="--art: {{ $artist['color'] }}"><span>{{ $artist['initials'] }}</span></div>
    <strong>{{ $artist['name'] }}</strong><span class="muted">Artista</span>
</a>
