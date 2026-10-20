# Investigação do Spotify para o Resona

Data: 2026-10-20. Skill: `reverse-engineer-anything`, versão 42.
Repositório inicial: somente README; nenhum AGENTS.md encontrado no diretório pai.

## Identidade e ferramentas

MCP REA 6.7.0 conectado, catálogo com 207 ferramentas. `open_binary`
identificou `/snap/spotify/current/usr/share/spotify/spotify` como ELF x86-64,
resolvido para revisão Snap 99. SHA-256:
`81fe35f3e09ce47b1b1c573eb32d680cafda870132e344c7185a881cdb927544`.

O pacote `Apps/xpui.spa` é ZIP, SHA-256
`7ce05c0001be22c7b5124d9dd59dd1ab1e0c188640967836b996f0d32a62f74e`.
REA inventariou 533 arquivos e 12 diretórios, sem contradições de integridade.

## Evidências e escopo

| ID | Operação | Resultado e alcance |
| --- | --- | --- |
| `ev_4db11ed1f081ec971de9c0a333147de5d604c98a98510873b503bc1e8f24140e` | inspect_artifact | Inventário estático completo das entradas ZIP; não é observação da UI |
| `ev_90675d5f329044cfc911414d1d160024ac6e0f3999b4f16ac236b4875b1395a2` | analyze_javascript_application | Quatro arquivos, 52 módulos, 45.062 nós AST, zero erros de parse; grafo parcial |
| `ev_560372c4696f674b86e70f425449a791722a69074aacb0e1a6ce154a6f58cad5` | trace_application_feature(search) | 37 sementes, 255 nós, 324 arestas; relações estáticas, parte inferida |
| `ev_58219ca42b433c96b2cac8137640f637e9212b5f8e1226093b26c4b048298af3` | gdb_console(file) | Executável carregado, sem símbolos de depuração |
| `ev_8ac8db60819fffd0f2770e66b53c60064f7be09e4b9d9d90a61abea79a5e9b53` | gdb_console(run) | Processo iniciado com remote-debugging-port=9223; encerrou com código 01 |

O bundle completo fica em `evidence-bundle.local.json`, ignorado pelo Git:
contém resultados extensos e fragmentos proprietários, não recursos do Resona.
Os achados revisáveis e a proveniência ficam neste diretório versionado.

## Fatos observados nos arquivos, não na interface

Os módulos foram extraídos de xpui.spa para `/tmp/resona-reference-xpui`
sem executar seus scripts. A análise REA selecionou explicitamente:

- `xpui-routes-search.js`: literais `/search`, `:query`, `:query/:category`,
  `tracks`, `artists`, `albums`, `search.empty-results-title`,
  `search.title.top-result`, `search-tracks-result` e wrappers de entidades.
- `xpui-routes-album.js`: `desktop-album.header.artistName`,
  `desktop-album.trackList`, `album-page.more-by-artist`.
- `xpui-routes-collection-songs.js`: `playlist.search_in_playlist`,
  `sort.title`, `sort.artist`, `sort.album`, chaves de estado vazio,
  ordenações por título/artista/álbum/data e referência a `/search`.
- `home-v2.js`: módulo presente e parseado; a leitura de literais selecionada
  não forneceu detalhes suficientes para reconstruir seu comportamento.

Esses literais foram conferidos por leitura complementar dos mesmos bytes.
Chaves de tradução classificadas como candidatos de endpoint pelo REA NÃO
são tratadas como chamadas de rede comprovadas.

## Hipóteses

Busca com categorias e estados vazios, álbum com faixas e artista relacionado,
coleção com busca e ordenação são intenções prováveis do código empacotado.
Não foi comprovado que todos esses caminhos estão habilitados nesta instalação.
Não há evidência para recomendar cópia exata de cores, espaçamento ou animações.

## Limitações e questões abertas

`binary_overview` falhou com `provider_timeout` após 120 s aguardando Hopper.
Não foi determinada a causa: análise demorada e diálogo pendente são possibilidades.
Ghidra não configurado. Captura nativa de UI do REA exige macOS e está indisponível
neste Linux. Como alternativa, o GDB do REA iniciou o executável, que encerrou
com código 1; os registros disponíveis não explicam a causa. Não há screenshot,
árvore de acessibilidade, login, reprodução ou transição visual observada.

O grafo JavaScript deixa seis arquivos do diretório selecionado fora da análise,
dependências externas não resolvidas, 6 desconhecidos no grafo de aplicação e
9.787 desconhecidos semânticos; o limite semântico foi 1.000 nós/arquivo e 4.000
no total. A extração é subconjunto do ZIP, não o aplicativo completo.

Questões: início (parcial, só estrutura); busca (estática parcial); biblioteca
(estática parcial); álbum (estática parcial); artista (só referências, parcial);
faixa (wrappers e listas, parcial); visual e runtime (não resolvidos).

## Relação com a implementação

| Evidência estática | Decisão no Resona | Verificação prevista |
| --- | --- | --- |
| Busca por query/category e wrappers | Busca local por faixas, artistas e álbuns, categorias e estado vazio | Testes HTTP com consultas e categorias |
| Álbum: artista e trackList | Página de álbum com artista navegável e lista de faixas | Testes de relações e 404 |
| Coleção: filtro/sort/empty | Biblioteca de faixas salvas, filtro, ordenação, chamada para busca quando vazia | Testes de persistência e isolamento de sessão |
| Referências Artist/Track | Páginas de artista e faixa usando relações do catálogo | Testes de navegação |
| home-v2 presente | Rota início; composição editorial própria, não atribuída ao Spotify | Smoke test |

Identidade violeta/menta, artes geométricas, catálogo fictício, persistência local
e shell desktop são escolhas próprias. Reprodução de arquivos locais é uma
extensão própria, sem afirmar equivalência com o streaming do Spotify.
