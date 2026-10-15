# DashPRO

Dashboard corporativo em Google Apps Script para solicitações de reposição, execução, produção e Qualidade. A cobertura da Qualidade usa **BASE** como denominador. A aplicação não escreve na planilha.

## Baixar ou copiar os arquivos

- [Baixar o pacote completo Apps Script](entrega/DashPRO-AppsScript.zip)
- [Copiar Code.gs](entrega/Code.gs)
- [Copiar Index.html](entrega/Index.html)
- [Copiar appsscript.json](entrega/appsscript.json)

No GitHub, abra o arquivo e use **Raw / Download raw file** para salvar. Para instalar, use os três arquivos da pasta `entrega/`; não misture com os módulos da pasta `apps-script/`.

## Instalar no Google Apps Script

A entrega compacta contém **Code.gs**, **Index.html**, **appsscript.json**, LEIA-ME.md e VALIDACAO.md. São os mesmos módulos do repositório, reunidos para facilitar a instalação, sem dependências externas de produção.

1. Abra a planilha de destino no Google Sheets e selecione **Extensões → Apps Script**. Também é possível criar um projeto independente em script.google.com usando uma conta com acesso à planilha.
2. No projeto, substitua o conteúdo de `Code.gs` pelo `Code.gs` da entrega compacta. Crie um arquivo **HTML** chamado `Index` e cole o conteúdo de `Index.html`. Não misture a entrega compacta com os módulos individuais.
3. Em **Configurações do projeto**, habilite a exibição de `appsscript.json`. Substitua seu conteúdo pelo manifesto da entrega. Ele declara V8 e somente o escopo `spreadsheets.readonly`.
4. Em **Propriedades do script**, configure `SPREADSHEET_ID` com `1ExgwfrUZy9a_aKla_Q4qgfgCY3Rm5cCchDMxPcYU05g`. Esse já é o padrão do código; a propriedade permite trocar a fonte sem editar a aplicação. Não use a URL inteira como ID.
5. No editor, selecione **getDashboardData** e execute uma vez. Autorize a leitura da planilha com a conta apropriada. Não é necessário fornecer token, senha ou chave de API ao dashboard.
6. Selecione **Implantar → Nova implantação → Aplicativo da Web**. Prefira **executar como o usuário que acessa o aplicativo**, se essa opção estiver disponível; cada usuário precisará de permissão de leitura da planilha e poderá precisar autorizar o aplicativo. Restrinja o público à organização ou às contas autorizadas, conforme as opções da sua conta. **Não escolha acesso anônimo.**
7. Se a política da organização exigir executar como o proprietário, o app lerá com as permissões do proprietário; limite rigorosamente quem acessa o Web App, pois esses usuários recebem os dados projetados da planilha mesmo sem acesso direto a ela. Essa configuração deve seguir a política interna.
8. Abra a URL **/exec** fornecida pelo próprio Google. Confirme o horário da leitura, visite as sete páginas e compare uma OP e uma solicitação conhecidas com as linhas de origem. Em Qualidade, confira separadamente cobertura de OP e de solicitação.
9. Para atualizar o código de uma implantação existente, salve os arquivos e use **Implantar → Gerenciar implantações → Editar → Nova versão**. Atualizar arquivos no editor não atualiza automaticamente a versão /exec em uso.

As opções de público e execução variam com Google Workspace e a política do administrador. Se a implantação for bloqueada, solicite a liberação ao administrador; não amplie o público como contorno.

### Alternativa: módulos individuais

Copie todos os arquivos de `apps-script/` para o editor, preservando os nomes: `Code`, `DataService` e `Schema` como arquivos de script; `Index`, `Styles`, `Analytics`, `Charts`, `Filters`, `Table` e `App` como HTML. Use o mesmo manifesto. Não é necessário compilar ou instalar npm para executar no Google.

## Uso

- A abertura faz **uma chamada de dados**. Após a leitura, navegação, filtros e gráficos operam em memória no navegador. Nenhum recurso de CDN é necessário.
- **Atualizar dados** lê novamente as abas e mantém as seleções. Falhas preservam o snapshot anterior e mostram aviso de desatualização.
- Filtros permitem pesquisa, múltiplas escolhas, todas ou nenhuma. **Limpar filtro** significa todas; **Selecionar nenhum** produz zero resultados. Combine dimensões com E; opções da mesma dimensão operam com OU.
- O estado dos filtros é preservado por página. **Restaurar filtros** volta ao período completo. As opções não desaparecem em cascata ao selecionar outra dimensão, permitindo ampliar o recorte.
- Clique em barras para filtrar categorias e nos meses para selecionar o período. Em Qualidade, o gráfico de cobertura recorta somente o detalhamento, preservando seu denominador.
- Tabelas têm 50 linhas por página, cabeçalhos ordenáveis, rolagem horizontal e CSV de **todo o recorte**, não só da página visível. CSV usa ponto e vírgula, UTF-8 e proteção contra interpretação de fórmulas em campos textuais.
- O painel de integridade identifica aba, linha, campo e tipo de anomalia; exporte seus diagnósticos para conferir a lista completa. Erro de cabeçalho bloqueia a página afetada, sem transformar a ausência de dados em zero.

## Como os indicadores são calculados

**Cobertura por OP:** OPs únicas da coorte filtrada da BASE encontradas em QUALIDADE ÷ OPs únicas válidas dessa coorte.

**Cobertura por solicitação:** solicitações únicas da coorte filtrada da BASE encontradas em QUALIDADE ÷ solicitações únicas válidas dessa coorte. Vazios, hífen e zero ficam fora do denominador; há contagem explícita de registros sem solicitação.

Auditoria válida tem OP ou solicitação e resultado APROVADO/REPROVADO. A existência de várias auditorias não aumenta a cobertura. OP isolada, solicitação isolada e par exato são relações diferentes; o painel apresenta o diagnóstico de pares.

O período principal da página Qualidade filtra **DATA SOLICITAÇÃO da BASE**. A cobertura indica auditada em algum momento até a leitura. Os filtros de resultado, turno e período de auditoria afetam somente os eventos e a aprovação, nunca o denominador da cobertura. Eventos vinculam-se pela solicitação; se ela estiver ausente no evento, pela OP. Auditorias sem vínculo com toda a BASE têm lista própria, sem herdar os filtros de evento.

**Aprovação por evento:** APROVADO ÷ eventos vinculados à coorte com resultado válido. Não é cobertura. A aprovação da página pode diferir do total geral da aba Qualidade.

**Último resultado:** evento mais recente com cronologia válida por par OP/solicitação. Empate de instante com resultados diferentes é CONFLITANTE. Mais de um evento por par é sinalizado; não é excluído automaticamente como duplicação.

**Datas inválidas/futuras:** continuam sinalizadas; um evento com resultado válido comprova presença para cobertura, mas não entra em tendências ou prazos quando sua cronologia não é válida. Denominador zero exibe **Sem base**.

**Volumes:** BASE soma FALTA TOTAL por registro; reposições somam peças por linha de item; produção soma SAFL-QtPCON por apontamento. Nenhum desses totais é anunciado como volume físico único de OP. Repetições de ID ITEM são preservadas. Situação e Análise PCP são dimensões distintas; ANALISE não é automaticamente uma pendência.

**Prazo de reposição:** mediana de dias de DATA até RECEBIMENTO SLMB, com ambas as datas válidas, não futuras e fim >= início. O cartão informa quantos registros entraram e quantos foram excluídos.

**Artigos:** peças solicitadas por mil = 1000 × Solicitado / Produzido. Não é contagem de solicitações por mil. Asakai e Artigos apresentam os resumos originais sem somar seus valores às bases operacionais; Asakai preserva unidade original e origem de célula, sem inferir histórico.

O fuso dos dados é o da própria planilha. A leitura entre abas não é transacional; a janela da leitura fica visível. E-mails e observações livres da BASE não são enviados ao navegador. OPs e demais dados operacionais projetados ficam disponíveis aos usuários autorizados do dashboard.

## Desenvolvimento e validação local

Node.js 24 ou superior. Não é necessário usar Git worktree neste ambiente isolado.

```sh
npm ci
npm test
npm run check
npm run test:ui
npm run benchmark
npm run package
```

Os testes de navegador usam Chromium em `/usr/bin/chromium`; configure `CHROMIUM_PATH` para outro executável compatível. O Playwright está fixado no lockfile. Se for necessário instalar um navegador de teste, use `npx playwright install chromium` e aponte `CHROMIUM_PATH` para o executável instalado. Não desabilite a verificação TLS.

`npm run preview` inicia uma página local de validação com dados **sintéticos** e aviso explícito. Ela reutiliza todos os HTMLs de produção, trocando somente o adaptador de carga; não é a implantação online e não se conecta à planilha. O dashboard de produção não contém dados de exemplo embutidos.

`npm run benchmark` mede 40 ações após aquecimento, com 37.701 linhas de produção e os volumes representativos das demais abas. Mede aplicação de filtro, atualização do DOM e layout, sem esperar a animação terminar. A meta é p95 <=200 ms nessa máquina. A meta inicial de abertura quente no Google é <=5 s, ainda dependente de medição online.

Para reconciliar o Excel fornecido, mantenha os arquivos somente em `.local/`, que é ignorado pelo Git. Requer Python 3 com openpyxl:

```sh
python scripts/import-xlsx.py /caminho/planilha.xlsx .local/workbook.json
node scripts/reconcile.cjs .local/workbook.json .local/snapshot.json
node scripts/benchmark.cjs .local/snapshot.json
```

O utilitário de reconciliação usa os contratos da amostra aprovada e exige 967 eventos, 916 aprovados e 51 reprovados. Uma nova versão da planilha pode ter contagens diferentes; esse comando é uma conferência da amostra, não um requisito fixo do aplicativo. O importador local interpreta datas do Excel em America/Sao_Paulo; a aplicação online usa o fuso real da planilha.

Consulte [VALIDATION.md](docs/VALIDATION.md) para resultados e limites. A instalação e a publicação no Google exigem a conta autorizada; não foram efetuadas automaticamente por esta sessão.
