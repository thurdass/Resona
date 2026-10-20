<?php

namespace Tests\Feature;

use Tests\TestCase;

class MusicTest extends TestCase
{
    public function test_navigation_and_entity_relationships(): void
    {
        $this->get('/')->assertOk()->assertSee('Deixe o mundo')->assertSee('/search');
        $this->get('/search')->assertOk()->assertSee('Comece por uma descoberta');
        $this->get('/albums/entre-luzes')->assertOk()->assertSee('Primeira Luz')->assertSee('/artists/aurora');
        $this->get('/artists/aurora')->assertOk()->assertSee('Discografia')->assertSee('/albums/entre-luzes');
        $this->get('/tracks/primeira-luz')->assertOk()->assertSee('Primeira Luz')->assertSee('/albums/entre-luzes');
        foreach (['albums', 'artists', 'tracks'] as $type) {
            $this->get('/'.$type.'/unknown')->assertNotFound();
        }
    }

    public function test_search_categories_empty_results_and_input_validation(): void
    {
        $this->get('/search?q=aurora')->assertOk()->assertSee('Primeira Luz')->assertSee('Aurora Norte');
        $this->get('/search?q=aurora&type=artists')->assertOk()->assertSee('Aurora Norte')->assertDontSee('Primeira Luz');
        $this->get('/search?q=ENTRE&type=albums')->assertOk()->assertSee('Entre Luzes');
        $this->get('/search?q=impossivel')->assertOk()->assertSee('Nenhum encontro por aqui');
        $this->getJson('/search?type=invalid')->assertUnprocessable();
        $this->getJson('/search?q[]=invalid')->assertUnprocessable();
        $this->get('/search?q=%3Cscript%3E')->assertOk()->assertDontSee('<script>', false)->assertSee('&lt;script&gt;', false);
    }

    public function test_library_save_remove_filter_sort_and_unknown_track(): void
    {
        $this->get('/library')->assertOk()->assertSee('Sua coleção começa');
        $this->postJson('/library/tracks/primeira-luz')->assertOk()->assertJson(['saved' => true, 'count' => 1]);
        $this->postJson('/library/tracks/sal')->assertOk()->assertJson(['saved' => true, 'count' => 2]);
        $this->get('/library?sort=artist')->assertOk()->assertSeeInOrder(['Primeira Luz', '>Sal<'], false);
        $this->get('/library?q=sal')->assertOk()->assertSee('>Sal<', false)->assertDontSee('Primeira Luz');
        $this->get('/library?q=ausente')->assertOk()->assertSee('Nenhuma faixa para este filtro');
        $this->postJson('/library/tracks/primeira-luz')->assertOk()->assertJson(['saved' => false, 'count' => 1]);
        $this->get('/library')->assertOk()->assertDontSee('Primeira Luz');
        $this->postJson('/library/tracks/unknown')->assertNotFound();
        $this->withSession(['saved' => []])->get('/library')->assertOk()->assertDontSee('>Sal<', false);
    }
}
