<?php

use App\Http\Controllers\MusicController;
use Illuminate\Support\Facades\Route;

Route::get('/', [MusicController::class, 'home'])->name('home');
Route::get('/search', [MusicController::class, 'search'])->name('search');
Route::get('/library', [MusicController::class, 'library'])->name('library');
Route::get('/albums/{id}', [MusicController::class, 'album'])->name('album');
Route::get('/artists/{id}', [MusicController::class, 'artist'])->name('artist');
Route::get('/tracks/{id}', [MusicController::class, 'track'])->name('track');
Route::post('/library/tracks/{id}', [MusicController::class, 'save'])->name('save');
