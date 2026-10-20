Resona para Windows e Linux x64: biblioteca musical local, offline, sem conta.

- **Windows 10/11:** baixe o `.exe` para instalar, ou extraia o ZIP inteiro e execute `resona.exe`.
- **Ubuntu/Debian Linux:** instale o `.deb` e abra Resona pelo menu de aplicativos. O instalador configura o sandbox do Electron.
- **Outros Linux:** extraia o `.tar.gz` e execute `resona`. O sistema precisa permitir o sandbox do Chromium via namespaces de usuário; prefira o `.deb` em Ubuntu/Debian.

PHP e Electron já estão incluídos. Não é necessário instalar PHP, Node ou Composer. As músicas originais não são copiadas, alteradas ou excluídas. Biblioteca e preferências ficam no perfil do usuário.

Os pacotes x64 passam por testes de importação, deduplicação, persistência, reprodução com avanço de tempo, fila, navegação, controles e arquivos indisponíveis em runners Windows e Linux. Esses testes não verificam saída audível em caixas de som.

O instalador Windows ainda não possui assinatura digital e pode exibir aviso de editor desconhecido. Confira os hashes em `SHA256SUMS.txt`.
