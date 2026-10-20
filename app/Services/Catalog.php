<?php

namespace App\Services;

use Illuminate\Support\Collection;

class Catalog
{
    public function all(): array
    {
        return require resource_path('catalog/demo.php');
    }

    public function find(string $type, string $id): array
    {
        return collect($this->all()[$type])->firstWhere('id', $id) ?? abort(404);
    }

    public function tracks(?string $album = null, ?string $artist = null): Collection
    {
        $data = $this->all();

        return collect($data['tracks'])->filter(fn ($t) => (! $album || $t['album_id'] === $album) && (! $artist || $t['artist_id'] === $artist))
            ->map(fn ($t) => $t + [
                'artist' => collect($data['artists'])->firstWhere('id', $t['artist_id']),
                'album' => collect($data['albums'])->firstWhere('id', $t['album_id']),
            ])->values();
    }

    public function search(string $query): array
    {
        $query = mb_strtolower(trim($query));
        $data = $this->all();
        $data['tracks'] = $this->tracks()->all();
        foreach ($data as $type => $items) {
            $data[$type] = array_values(array_filter($items, function ($item) use ($query) {
                $text = $item['name'].' '.($item['artist']['name'] ?? '').' '.($item['album']['name'] ?? '');

                return $query !== '' && str_contains(mb_strtolower($text), $query);
            }));
        }

        return $data;
    }
}
