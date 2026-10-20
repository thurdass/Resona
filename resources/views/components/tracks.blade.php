@props(['tracks', 'saved'])
<div class="track-scroll"><table class="tracks">
    <thead><tr><th scope="col">#</th><th scope="col">Faixa / artista</th><th scope="col">Álbum</th><th scope="col">Duração</th><th scope="col"><span class="sr-only">Biblioteca</span></th></tr></thead>
    <tbody>@foreach($tracks as $t)
    <tr><td>{{ $loop->iteration }}</td><td><a class="track-title" href="{{ route('track', $t['id']) }}">{{ $t['name'] }}</a><a class="muted" href="{{ route('artist', $t['artist_id']) }}">{{ $t['artist']['name'] }}</a></td>
        <td><a href="{{ route('album', $t['album_id']) }}">{{ $t['album']['name'] }}</a></td><td>{{ intdiv($t['duration'], 60) }}:{{ str_pad($t['duration'] % 60, 2, '0', STR_PAD_LEFT) }}</td>
        <td><button class="save" data-save="{{ $t['id'] }}" aria-pressed="{{ in_array($t['id'], $saved) ? 'true' : 'false' }}" aria-label="Salvar {{ $t['name'] }} na biblioteca">{{ in_array($t['id'], $saved) ? '♥' : '♡' }}</button></td>
    </tr>
    @endforeach</tbody>
</table></div>
