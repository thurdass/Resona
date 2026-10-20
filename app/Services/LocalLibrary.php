<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LocalLibrary
{
    /** @param array<int, string> $paths
     * @return array{imported: int, skipped: int, errors: array<int, string>}
     */
    public function import(array $paths): array
    {
        $result = ['imported' => 0, 'skipped' => 0, 'errors' => []];
        foreach ($paths as $path) {
            $real = realpath($path);
            if (! $real || ! is_file($real) || ! is_readable($real)) {
                $result['errors'][] = basename($path).': arquivo indisponível.';

                continue;
            }
            if (DB::table('music_tracks')->where('path', $real)->exists()) {
                $result['skipped']++;

                continue;
            }
            $analyzer = new \getID3;
            $analyzer->setOption(['option_save_attachments' => true]);
            try {
                $info = $analyzer->analyze($real);
                \getid3_lib::CopyTagsToComments($info);
                if (empty($info['audio']) || ! empty($info['error'])) {
                    $result['errors'][] = basename($path).': formato de áudio inválido ou incompatível.';

                    continue;
                }
                $tags = $info['comments'] ?? [];
                foreach (['title' => 'title', 'artist' => 'artist', 'product' => 'album'] as $riffKey => $tagKey) {
                    $raw = $info['riff']['comments'][$riffKey][0] ?? null;
                    if (is_string($raw) && mb_check_encoding($raw, 'UTF-8')) {
                        $tags[$tagKey] = [trim($raw, " \t\r\n\0")];
                    }
                }
                if (empty($tags['album']) && ! empty($tags['product'])) {
                    $tags['album'] = $tags['product'];
                }
                $picture = $tags['picture'][0] ?? null;
                $mime = $picture ? (new \finfo(FILEINFO_MIME_TYPE))->buffer($picture['data'] ?? '') : null;
                $hasCover = in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true) && strlen($picture['data']) <= 5 * 1024 * 1024;
                DB::table('music_tracks')->insert([
                    'id' => (string) Str::uuid(), 'path' => $real,
                    'title' => mb_substr(trim($tags['title'][0] ?? '') ?: pathinfo($real, PATHINFO_FILENAME), 0, 500),
                    'artist' => mb_substr(trim($tags['artist'][0] ?? '') ?: 'Artista desconhecido', 0, 500),
                    'album' => mb_substr(trim($tags['album'][0] ?? '') ?: 'Sem álbum', 0, 500),
                    'duration' => max(0, (float) ($info['playtime_seconds'] ?? 0)),
                    'cover' => $hasCover ? base64_encode($picture['data']) : null,
                    'cover_mime' => $hasCover ? $mime : null,
                ]);
                $result['imported']++;
            } catch (\Throwable $exception) {
                $result['errors'][] = basename($path).': não foi possível ler o áudio.';
            }
        }

        return $result;
    }

    /** @return array<string, mixed> */
    public function state(): array
    {
        return [
            'tracks' => DB::table('music_tracks')->select('id', 'title', 'artist', 'album', 'duration', 'favorite', 'cover_mime')->orderBy('title')->get()->map(function (object $track): object {
                $track->favorite = (bool) $track->favorite;
                $track->cover = $track->cover_mime ? route('cover', $track->id) : null;
                unset($track->cover_mime);

                return $track;
            }),
            'playlists' => DB::table('music_playlists')->orderBy('name')->get()->map(function (object $playlist): object {
                $playlist->tracks = json_decode($playlist->tracks, true);

                return $playlist;
            }),
            'preferences' => DB::table('music_preferences')->pluck('value', 'key')->map(fn (string $value): mixed => json_decode($value, true)),
        ];
    }
}
