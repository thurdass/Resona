<?php

namespace App\Http\Controllers;

use App\Services\Catalog;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MusicController extends Controller
{
    public function __construct(private Catalog $catalog) {}

    public function home(): View
    {
        return $this->page('home', ['title' => 'Seu próximo encontro com a música', 'tracks' => $this->catalog->tracks()->take(4)]);
    }

    public function search(Request $request): View
    {
        $input = $request->validate(['q' => 'nullable|string|max:200', 'type' => 'nullable|in:all,tracks,artists,albums']);
        $query = $input['q'] ?? '';

        return $this->page('search', ['title' => 'Busca', 'query' => $query, 'type' => $input['type'] ?? 'all', 'results' => $this->catalog->search($query)]);
    }

    public function library(Request $request): View
    {
        $input = $request->validate(['q' => 'nullable|string|max:200', 'sort' => 'nullable|in:name,artist,album']);
        $tracks = $this->catalog->tracks()->whereIn('id', $request->session()->get('saved', []));
        $query = $input['q'] ?? '';
        $tracks = $tracks->filter(fn ($t) => str_contains(mb_strtolower($t['name'].' '.$t['artist']['name']), mb_strtolower($query)));
        $sort = $input['sort'] ?? 'name';
        $tracks = $tracks->sortBy(match ($sort) {
            'artist' => 'artist.name', 'album' => 'album.name', default => 'name'
        })->values();

        return $this->page('library', ['title' => 'Sua biblioteca', 'tracks' => $tracks, 'query' => $query, 'sort' => $sort]);
    }

    public function album(string $id): View
    {
        $album = $this->catalog->find('albums', $id);

        return $this->page('album', ['title' => $album['name'], 'album' => $album, 'artist' => $this->catalog->find('artists', $album['artist_id']), 'tracks' => $this->catalog->tracks(album: $id)]);
    }

    public function artist(string $id): View
    {
        $artist = $this->catalog->find('artists', $id);

        return $this->page('artist', ['title' => $artist['name'], 'artist' => $artist, 'tracks' => $this->catalog->tracks(artist: $id), 'artistAlbums' => collect($this->catalog->all()['albums'])->where('artist_id', $id)]);
    }

    public function track(string $id): View
    {
        $track = $this->catalog->tracks()->firstWhere('id', $id) ?? abort(404);

        return $this->page('track', ['title' => $track['name'], 'track' => $track, 'tracks' => collect([$track])]);
    }

    public function save(Request $request, string $id): JsonResponse
    {
        $this->catalog->find('tracks', $id);
        $saved = $request->session()->get('saved', []);
        $saved = in_array($id, $saved, true) ? array_values(array_diff($saved, [$id])) : [...$saved, $id];
        $request->session()->put('saved', $saved);

        return response()->json(['saved' => in_array($id, $saved, true), 'count' => count($saved)]);
    }

    private function page(string $page, array $data): View
    {
        return view('music', $data + ['page' => $page, 'catalog' => $this->catalog->all(), 'saved' => session('saved', [])]);
    }
}
