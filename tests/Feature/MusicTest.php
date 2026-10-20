<?php

namespace Tests\Feature;

use App\Services\LocalLibrary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MusicTest extends TestCase
{
    use RefreshDatabase;

    private string $audioPath;

    protected function setUp(): void
    {
        parent::setUp();
        $this->audioPath = sys_get_temp_dir().'/resona música & # '.bin2hex(random_bytes(6)).'.wav';
        $data = str_repeat(pack('v', 0), 8000);
        file_put_contents($this->audioPath, 'RIFF'.pack('V', 36 + strlen($data)).'WAVEfmt '.pack('VvvVVvv', 16, 1, 1, 8000, 16000, 2, 16).'data'.pack('V', strlen($data)).$data);
    }

    protected function tearDown(): void
    {
        if (is_file($this->audioPath)) {
            unlink($this->audioPath);
        }
        parent::tearDown();
    }

    public function test_real_collection_starts_empty_and_does_not_expose_demo_or_paths(): void
    {
        $this->get('/')->assertOk()->assertSee('Abrir músicas')->assertDontSee('Primeira Luz');
        $this->getJson('/api/library', ['Origin' => 'https://external.invalid'])->assertOk()->assertHeaderMissing('Access-Control-Allow-Origin')->assertJsonCount(0, 'tracks');
        $this->postJson('/internal/import', ['paths' => [$this->audioPath]])->assertForbidden();
        $this->get('/media/'.rawurlencode($this->audioPath))->assertNotFound();
    }

    public function test_authorized_import_deduplicates_reads_metadata_and_streams_ranges(): void
    {
        config(['desktop.token' => 'test-secret']);
        $headers = ['X-Resona-Import' => 'test-secret'];
        $this->postJson('/internal/import', ['paths' => [$this->audioPath]], $headers)->assertOk()->assertJson(['imported' => 1, 'skipped' => 0, 'errors' => []]);
        $this->postJson('/internal/import', ['paths' => [$this->audioPath]], $headers)->assertOk()->assertJson(['imported' => 0, 'skipped' => 1]);
        $state = $this->getJson('/api/library')->assertOk()->assertJsonPath('tracks.0.artist', 'Artista desconhecido')->json();
        $this->assertArrayNotHasKey('path', $state['tracks'][0]);
        $this->assertEqualsWithDelta(1, $state['tracks'][0]['duration'], 0.01);
        $id = $state['tracks'][0]['id'];
        $response = $this->get('/media/'.$id, ['Range' => 'bytes=0-43']);
        $response->baseResponse->prepare(Request::create('/media/'.$id, 'GET', server: ['HTTP_RANGE' => 'bytes=0-43']));
        $response->assertStatus(206)->assertHeader('Content-Range', 'bytes 0-43/16044');
        unlink($this->audioPath);
        $this->get('/media/'.$id)->assertNotFound();
    }

    public function test_invalid_missing_and_inaccessible_files_are_reported_without_importing(): void
    {
        file_put_contents($this->audioPath, 'not audio');
        $result = app(LocalLibrary::class)->import([$this->audioPath, $this->audioPath.'.missing']);
        $this->assertSame(0, $result['imported']);
        $this->assertCount(2, $result['errors']);
        $this->assertDatabaseCount('music_tracks', 0);
    }

    public function test_unreadable_originals_are_reported_and_not_streamed(): void
    {
        app(LocalLibrary::class)->import([$this->audioPath]);
        $id = DB::table('music_tracks')->value('id');
        chmod($this->audioPath, 0000);
        clearstatcache(true, $this->audioPath);
        try {
            $this->assertFalse(is_readable($this->audioPath));
            $this->get('/media/'.$id)->assertNotFound();
            $result = app(LocalLibrary::class)->import([$this->audioPath]);
            $this->assertCount(1, $result['errors']);
        } finally {
            chmod($this->audioPath, 0600);
        }
    }

    public function test_utf8_riff_tags_keep_accents_and_map_product_to_album(): void
    {
        $chunks = '';
        foreach (['INAM' => 'Maré', 'IART' => 'Órbita', 'IPRD' => 'Canções'] as $key => $value) {
            $value .= "\0";
            $chunks .= $key.pack('V', strlen($value)).$value.(strlen($value) % 2 ? "\0" : '');
        }
        $original = file_get_contents($this->audioPath);
        $list = 'INFO'.$chunks;
        $audio = $original.'LIST'.pack('V', strlen($list)).$list;
        $audio = substr_replace($audio, pack('V', strlen($audio) - 8), 4, 4);
        file_put_contents($this->audioPath, $audio);
        app(LocalLibrary::class)->import([$this->audioPath]);
        $this->getJson('/api/library')->assertJsonPath('tracks.0.title', 'Maré')->assertJsonPath('tracks.0.artist', 'Órbita')->assertJsonPath('tracks.0.album', 'Canções');
    }

    public function test_favorites_playlists_preferences_validation_and_removal_preserve_originals(): void
    {
        app(LocalLibrary::class)->import([$this->audioPath]);
        $id = DB::table('music_tracks')->value('id');
        $this->putJson('/api/tracks/'.$id.'/favorite', ['favorite' => true])->assertOk();
        $this->putJson('/api/playlists', ['name' => 'Vazia', 'tracks' => []])->assertOk();
        DB::table('music_playlists')->where('name', 'Vazia')->delete();
        $playlist = $this->putJson('/api/playlists', ['name' => 'Minha coleção', 'tracks' => [$id, $id]])->assertOk()->json('id');
        $this->putJson('/api/preferences', ['volume' => 0.4, 'shuffle' => true, 'repeat' => 'all', 'queue' => [$id], 'current' => $id])->assertOk();
        $this->getJson('/api/library')->assertJsonPath('tracks.0.favorite', true)->assertJsonPath('playlists.0.tracks', [$id])->assertJsonPath('preferences.volume', 0.4);
        $this->putJson('/api/preferences', ['volume' => 4])->assertUnprocessable();
        $this->putJson('/api/playlists', ['name' => 'Bad', 'tracks' => ['invalid']])->assertUnprocessable();
        $this->deleteJson('/api/tracks/'.$id)->assertOk();
        $this->assertFileExists($this->audioPath);
        $this->getJson('/api/library')->assertJsonCount(0, 'tracks')->assertJsonPath('playlists.0.tracks', []);
        $this->deleteJson('/api/playlists/'.$playlist)->assertOk();
        $this->assertDatabaseCount('music_playlists', 0);
    }
}
