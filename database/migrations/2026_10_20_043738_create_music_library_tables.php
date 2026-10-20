<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('music_tracks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('path')->unique();
            $table->text('title');
            $table->text('artist');
            $table->text('album');
            $table->float('duration')->default(0);
            $table->text('cover')->nullable();
            $table->string('cover_mime')->nullable();
            $table->boolean('favorite')->default(false);
        });
        Schema::create('music_playlists', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->text('tracks')->default('[]');
        });
        Schema::create('music_preferences', function (Blueprint $table): void {
            $table->string('key')->primary();
            $table->text('value');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('music_preferences');
        Schema::dropIfExists('music_playlists');
        Schema::dropIfExists('music_tracks');
    }
};
