<?php

use App\Http\Controllers\LibraryController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'music')->name('home');
Route::get('/api/library', [LibraryController::class, 'state']);
Route::post('/internal/import', [LibraryController::class, 'import']);
Route::get('/media/{id}', [LibraryController::class, 'audio'])->whereUuid('id')->name('audio');
Route::get('/covers/{id}', [LibraryController::class, 'cover'])->whereUuid('id')->name('cover');
Route::put('/api/tracks/{id}/favorite', [LibraryController::class, 'favorite'])->whereUuid('id');
Route::delete('/api/tracks/{id}', [LibraryController::class, 'remove'])->whereUuid('id');
Route::put('/api/playlists', [LibraryController::class, 'playlist']);
Route::delete('/api/playlists/{id}', [LibraryController::class, 'deletePlaylist'])->whereUuid('id');
Route::put('/api/preferences', [LibraryController::class, 'preferences']);
