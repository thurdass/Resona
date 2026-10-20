<?php

namespace App\Http\Controllers;

use App\Services\LocalLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class LibraryController extends Controller
{
    public function state(LocalLibrary $library): JsonResponse
    {
        return response()->json($library->state());
    }

    public function import(Request $request, LocalLibrary $library): JsonResponse
    {
        $token = config('desktop.token');
        abort_unless($token && hash_equals($token, $request->header('X-Resona-Import', '')), 403);
        $input = $request->validate(['paths' => 'required|array|max:500', 'paths.*' => 'required|string|max:4096']);

        return response()->json($library->import($input['paths']));
    }

    public function audio(string $id): BinaryFileResponse
    {
        $track = DB::table('music_tracks')->where('id', $id)->first();
        abort_unless($track && is_file($track->path) && is_readable($track->path), 404, 'Arquivo removido ou inacessível. Importe a localização atual.');

        return response()->file($track->path, ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function cover(string $id): Response
    {
        $track = DB::table('music_tracks')->where('id', $id)->first();
        abort_unless($track && $track->cover, 404);

        return response(base64_decode($track->cover), 200, ['Content-Type' => $track->cover_mime, 'X-Content-Type-Options' => 'nosniff']);
    }

    public function favorite(Request $request, string $id): JsonResponse
    {
        $input = $request->validate(['favorite' => 'required|boolean']);
        abort_unless(DB::table('music_tracks')->where('id', $id)->update($input), 404);

        return response()->json(['ok' => true]);
    }

    public function remove(string $id): JsonResponse
    {
        DB::transaction(function () use ($id): void {
            DB::table('music_tracks')->where('id', $id)->delete();
            foreach (DB::table('music_playlists')->get() as $playlist) {
                $tracks = array_values(array_diff(json_decode($playlist->tracks, true), [$id]));
                DB::table('music_playlists')->where('id', $playlist->id)->update(['tracks' => json_encode($tracks)]);
            }
        });

        return response()->json(['ok' => true]);
    }

    public function playlist(Request $request): JsonResponse
    {
        $input = $request->validate(['id' => 'nullable|uuid', 'name' => 'required|string|max:120', 'tracks' => 'present|array|max:10000', 'tracks.*' => 'uuid|exists:music_tracks,id']);
        $id = $input['id'] ?? (string) Str::uuid();
        DB::table('music_playlists')->updateOrInsert(['id' => $id], ['name' => trim($input['name']), 'tracks' => json_encode(array_values(array_unique($input['tracks'])))]);

        return response()->json(['id' => $id]);
    }

    public function deletePlaylist(string $id): JsonResponse
    {
        DB::table('music_playlists')->where('id', $id)->delete();

        return response()->json(['ok' => true]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $input = $request->validate(['volume' => 'sometimes|numeric|min:0|max:1', 'shuffle' => 'sometimes|boolean', 'repeat' => 'sometimes|in:off,all,one', 'queue' => 'sometimes|array|max:10000', 'queue.*' => 'uuid', 'current' => 'sometimes|nullable|uuid']);
        DB::transaction(function () use ($input): void {
            foreach ($input as $key => $value) {
                DB::table('music_preferences')->updateOrInsert(['key' => $key], ['value' => json_encode($value)]);
            }
        });

        return response()->json(['ok' => true]);
    }
}
