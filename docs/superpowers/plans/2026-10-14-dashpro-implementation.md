# DashPRO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Entregar um dashboard Apps Script de leitura, com sete páginas e cobertura de auditoria calculada sobre a BASE.

**Architecture:** HtmlService entrega a aplicação e uma chamada google.script.run obtém um snapshot compacto das seis abas. Normalização e diagnósticos ficam no servidor; índices, filtros e agregações rodam em memória no navegador. Sem CDN ou servidor externo em produção.

**Tech Stack:** Apps Script V8, HTML/CSS/JavaScript, SVG, Node.js 24 para node:test e Playwright como dependência de desenvolvimento para testes de navegador.

**Spec:** [Especificação aprovada](../specs/2026-10-14-dashpro-design.md).

## Global Constraints

- “A aplicação é somente leitura: não altera células, fórmulas, permissões ou registros da planilha.”
- “LINK contextualiza produção e nunca compõe o denominador dessa cobertura.”
- “Uma chamada `google.script.run` carrega o snapshot após o HTML inicial.”
- “Não persiste os dados em localStorage.”
- “Denominador zero exibe Sem base; nunca 0% ou infinito.”
- “Animações entre 150 e 250 ms; nenhuma impede interação.”
- “Tabelas paginadas de 50 linhas, ordenação e exportação CSV do recorte completo.”
- Não incluir a planilha recebida, credenciais ou dados pessoais no Git.
- Usar o checkout existente /workspace/DashPRO, sem criar worktree.
- Validação local não comprova implantação online; manter resultados distintos.

## Review Focus

- Atualizar a planilha entre duas leituras pode produzir snapshots divergentes: informar janela da leitura, sem prometer transação (tarefa 2).
- Solicitação com zeros iniciais e OP com sufixo podem gerar relações falsas: preservar texto e remover somente o sufixo permitido (tarefa 1).
- Resultado e turno de auditoria não podem reduzir o denominador da cobertura (tarefa 3).
- Resposta antiga de atualização não pode substituir uma mais recente, nem apagar a seleção de filtros (tarefa 6).
- Conteúdo de célula pode conter HTML ou fórmula de CSV: renderizar como texto e neutralizar exportação (tarefa 5).

## Estrutura e contratos compartilhados

Criar `apps-script/` com Code.gs, DataService.gs, Schema.gs, Index.html, Styles.html, App.html, Analytics.html, Charts.html, appsscript.json. Criar `tests/` com fixtures sintéticas, `scripts/` com ferramentas locais, README.md e package.json/package-lock.json. Nenhum build é necessário para copiar os arquivos Apps Script.

Contrato `Snapshot`: `{version:1, readStartedAt:string, readFinishedAt:string, timeZone:string, tables:Record<string,{columns:string[],rows:unknown[][]}>, diagnostics:Diagnostic[], unavailable:Record<string,string>}`. `Diagnostic`: `{sheet:string,row:number|null,field:string,code:string}`; não incluir valores pessoais. Toda tabela usa nomes canônicos definidos em Schema.gs; cada linha inclui sourceRow. Células de datas são strings ou null; identificadores são strings.

`Prepared`: `{snapshot:Snapshot, records:Record<string,Record<string,unknown>[]>, indexes:object}`. `FilterState`: `{dimensions:Record<string,string[]|null>,from:string|null,to:string|null}`; null significa todas, [] significa nenhuma. `ViewModel`: `{kpis:object[],charts:object[],rows:object[],diagnostics:Diagnostic[]}`. Detalhes internos de índices não escapam de Analytics.

### Tarefa 1: Normalização e contrato das abas

**Files:** criar apps-script/Schema.gs, tests/schema.test.cjs, tests/fixtures/workbook.cjs, scripts/load-source.cjs, package.json, .gitignore.

**Interfaces:** produzir `normalizeId(value):string|null`, `normalizeOrder(value):string|null`, `parseSheet(name,values,context):{columns,rows,diagnostics}`. Contexto contém `{now:string,timeZone:string}`. load-source avalia .gs e blocos JavaScript de .html em node:vm, sem duplicar código de produção.

- [x] Escrever testes `preserves_text_identifiers`, `strips_terminal_order_suffix_only`, `rejects_formula_only_rows`, `marks_invalid_dates_and_numeric_dates`, `maps_duplicate_turno_and_blank_quality_header`. Asserções: normalizeId('0012') === '0012'; normalizeId(12) === '12'; normalizeOrder('8823 (1)') === '8823'; normalizeOrder('88(ABC)') === '88(ABC)'; zero/hífen/vazio não viram chaves. BASE com ID/OP conta uma linha mesmo com ID repetido; linha sem ambos não conta. QUALIDADE ignora P/Q e aceita resultado somente APROVADO/REPROVADO com chave. LINK usa AH para turno. Data em consumo KG retorna null e diagnóstico.
- [x] Executar `node --test tests/schema.test.cjs`; confirmar falha por implementação ausente.
- [x] Implementar funções em Schema.gs conforme contratos e colunas da seção 3 da especificação. Preservar linha original e normalizar rótulos sem reescrever a fonte. Incluir parser de blocos Asakai A:BK e Página5 A:E; calcular medidas somente depois, em Analytics.
- [x] Executar o mesmo teste; exigir todas as asserções aprovadas.
- [x] Commit: `git add apps-script/Schema.gs tests scripts/load-source.cjs package.json .gitignore && git commit -m "feat: normalize dashboard source tables"`.

### Tarefa 2: Snapshot somente leitura no Apps Script

**Files:** criar apps-script/Code.gs, apps-script/DataService.gs, apps-script/appsscript.json, tests/data-service.test.cjs.

**Interfaces:** consumir parseSheet; produzir `getDashboardData():Snapshot`, `buildSnapshot(spreadsheet,context):Snapshot`, `doGet():HtmlOutput`, `include(name):string`. Helpers internos terminam em underscore; só getDashboardData é endpoint de dados público. Propriedade SPREADSHEET_ID usa a fonte aprovada como padrão.

- [x] Escrever testes `reads_each_sheet_in_bulk`, `serializes_dates`, `reports_read_window`, `isolates_missing_sheet`, `rejects_missing_required_columns`, `has_no_write_operations`. Mock de SpreadsheetApp registra chamadas: nenhum setValue/setValues, uma leitura em lote por aba e nenhuma por célula. Aba ausente só bloqueia a página correspondente; falha global de acesso lança erro claro. Assert JSON.stringify(snapshot) funciona e os dois horários existem.
- [x] Executar `node --test tests/data-service.test.cjs`; confirmar falha inicial.
- [x] Implementar leitura de intervalos limitados às colunas necessárias, serialização e contrato de erro. Manifesto V8 com escopo spreadsheets.readonly e fuso America/Sao_Paulo; dados respeitam o fuso real da planilha informado no snapshot. include aceita apenas nomes internos fixos.
- [x] Reexecutar os testes; exigir aprovação e conferir ausência de APIs de escrita.
- [x] Commit dos três arquivos de produção e teste: `git commit -m "feat: add read-only Apps Script snapshot service"` após git add desses arquivos.

### Tarefa 3: Filtros e métricas da BASE e Qualidade

**Files:** criar apps-script/Analytics.html, tests/analytics.test.cjs.

**Interfaces:** produzir `DashAnalytics.prepare(snapshot):Prepared`, `filterRows(rows,state):object[]`, `quality(prepared,cohortFilters,eventFilters):ViewModel`, `view(prepared,page,state):ViewModel`. page aceita overview, requests, replacements, production, quality, asakai, articles. Implementar overview/requests/quality nesta tarefa; demais páginas na tarefa 4.

- [x] Escrever testes `deduplicates_coverage_not_events`, `keeps_quality_denominator_under_event_filters`, `uses_base_cohort_dates`, `returns_no_base_for_empty_denominator`, `separates_pair_and_single_key_matches`, `reports_latest_conflicts_and_invalid_chronology`. Fixture: BASE tem (OP1,S1) duas vezes, (OP2,S2) uma vez e (OP3,sem solicitação). Qualidade tem dois eventos para (OP1,S1) e um evento sem correspondência. Assert cobertura OP = 1/3; solicitação = 1/2; auditorias vinculadas = 2. Filtrar resultado ou turno não muda esses denominadores. Data de auditoria fora do período da coorte ainda comprova presença; futura não entra na série temporal. Resultados opostos no mesmo instante geram Conflitante.
- [x] Executar `node --test tests/analytics.test.cjs`; confirmar falha inicial.
- [x] Implementar conjuntos e índices sem junções que multipliquem linhas. Aprovação por evento, reinspeções por par, divergência de flags e auditorias não vinculadas ficam separados. Datas inválidas não anulam presença de evento válido, mas excluem cronologia. OU dentro da dimensão e E entre dimensões; null e [] mantêm a semântica do contrato.
- [x] Reexecutar os testes; exigir cobertura entre 0 e 1 ou valor nulo em todos os casos.
- [x] Commit: `git add apps-script/Analytics.html tests/analytics.test.cjs && git commit -m "feat: calculate BASE audit coverage and local filters"`.

### Tarefa 4: Reposições, produção e resumos

**Files:** modificar apps-script/Analytics.html; criar tests/operational.test.cjs.

**Interfaces:** completar DashAnalytics.view com replacements, production, asakai e articles usando o contrato ViewModel da tarefa 3.

- [x] Escrever testes `preserves_item_granularity`, `calculates_eligible_lead_time`, `does_not_mix_summary_totals`, `computes_requested_pieces_per_thousand`, `separates_pcp_analysis_from_situation`. Duas linhas da mesma OP somam peças de itens mas contam uma OP; prazo negativo/futuro sai da mediana e entra em diagnóstico; solicitado=20 e produzido=200 resulta em 100 peças/mil; produzido zero resulta em null. Asakai não aumenta total da BASE. SITUAÇÃO=ANALISE e ANÁLISE PCP=ATENDIDA não viram pendência automática.
- [x] Executar `node --test tests/operational.test.cjs`; confirmar falha antes de implementar.
- [x] Completar agregações, séries e rankings da seção 5 da especificação; preservar unidades e bases de cálculo em cada KPI. Asakai apresenta blocos e origem, sem inferir histórico. Produção usa SAFL-QtPCON como apontamento por registro.
- [x] Reexecutar testes operacionais e analytics; exigir todos aprovados.
- [x] Commit desses arquivos com mensagem `feat: add operational and summary dashboard metrics`.

### Tarefa 5: Interface corporativa e gráficos interativos

**Files:** criar apps-script/Index.html, Styles.html, App.html, Charts.html; tests/ui.spec.cjs, playwright.config.cjs, scripts/preview.cjs. Atualizar package.json e gerar lockfile.

**Interfaces:** Charts expõe `DashCharts.render(container,chartModel,onSelect):void`. App usa DashAnalytics; `bootstrap(loadSnapshot):Promise<void>` recebe adaptador de carga real ou fixture sintética. preview monta os mesmos includes localmente e injeta apenas o adaptador de teste, sem implementar uma segunda interface.

- [x] Escrever testes de navegador `navigates_seven_pages`, `multiselect_and_chart_filter`, `paginates_fifty_rows`, `renders_untrusted_text_safely`, `escapes_csv_formulas`, `supports_keyboard_and_reduced_motion`. Assert sete páginas acessíveis, 50 linhas por página, pesquisa de opções, selecionar todos/nenhum, CSV de todo recorte, texto '<img onerror=...>' sem execução e valor '=1+1' exportado como texto seguro.
- [x] Instalar Playwright de desenvolvimento com versão exata no lockfile e Chromium suportado; executar `npx playwright test tests/ui.spec.cjs`; confirmar falhas de funcionalidade antes de implementar.
- [x] Aplicar Taste e referência Awesome DESIGN.md conforme especificação; implementar navegação, KPIs, estados, tabelas, filtros, ajuda de fórmulas, rankings top 10 + Outros, tooltips e seleção de período. Animação de 200 ms, reduzida quando solicitado. SVGs têm alternativa tabular e seleção por teclado. Não apresentar gráficos vazios como zero.
- [x] Executar os testes de navegador; inspecionar capturas desktop 1440×900 e mobile 390×844, sem sobreposição, texto cortado ou controles inacessíveis.
- [x] Commit dos arquivos da tarefa com mensagem `feat: build interactive corporate dashboard interface`.

### Tarefa 6: Carga única, atualização e desempenho

**Files:** modificar App.html; criar tests/loading.spec.cjs, scripts/benchmark.cjs, tests/fixtures/large-snapshot.cjs.

**Interfaces:** App conecta bootstrap ao google.script.run com success/failure handlers; requests têm sequência para ignorar respostas obsoletas. benchmark usa DashAnalytics.prepare/view e operações reais da interface; não substitui medições por loops sem renderização.

- [x] Escrever testes `loads_once_across_navigation_and_filters`, `keeps_snapshot_on_refresh_failure`, `ignores_stale_refresh`, `preserves_filter_state`. Contar uma chamada inicial e zero adicionais em navegação/filtros; atualizar gera uma chamada. Falha mantém dados e aviso desatualizado. Atualização bem-sucedida preserva seleções válidas; valores removidos são sinalizados e não restauram silenciosamente todas as opções.
- [x] Executar `npx playwright test tests/loading.spec.cjs`; confirmar falha inicial.
- [x] Implementar controle de carga/atualização, janela de leitura visível, métricas de payload/transformação/renderização e tratamento de erros sem truncar dados.
- [x] Executar testes e `node scripts/benchmark.cjs` com 37.701 registros LINK e volumes das demais abas próximos ao arquivo recebido. Registrar navegador/máquina, amostras e p95; meta filtros <=200 ms após aquecimento, sem contar animação. Inspecionar snapshot real local sem versioná-lo para reconciliar 916/967 eventos com resultado válido; o harness de importação Excel pode usar openpyxl já disponível.
- [x] Commit com mensagem `perf: verify single-load dashboard and instant filters` dos arquivos da tarefa, sem dados reais.

### Tarefa 7: Entrega reproduzível e verificação final

**Files:** criar README.md, docs/VALIDATION.md, scripts/check-appsscript.cjs; modificar package.json para scripts test, test:ui, check e benchmark.

**Interfaces:** check verifica referências de includes, manifesto JSON, sintaxe JavaScript dos .gs/.html e escopos de leitura; documentação usa os mesmos nomes de arquivos e comandos implementados.

- [x] Escrever teste de integridade em tests/package.test.cjs que exige todos os includes e manifesto válido com spreadsheets.readonly. Executar `node --test tests/package.test.cjs`; confirmar falha por documentação/check ausentes quando aplicável.
- [x] Implementar check e documentação: copiar arquivos para Apps Script, configurar SPREADSHEET_ID, autorizar leitura, implantar Web App com acesso organizacional e verificar identidade/permissões reais. Não publicar anonimamente nem solicitar credenciais no chat. Explicar implantação executando como usuário e as alternativas efetivamente oferecidas pela conta.
- [x] Executar `npm test`, `npm run check`, `npm run test:ui`, `npm run benchmark`; registrar comandos, resultados e limitações em VALIDATION.md. Conferir git diff e ausência de dados pessoais/arquivo Excel.
- [x] Se autenticação Google estiver disponível, validar endpoint real e carga fria/quente; meta inicial quente <=5 s. Se indisponível, marcar implantação e tempo online como não executados, mantendo instruções exatas para a conta autorizada.
- [x] Commit da entrega com mensagem `docs: document deployment and verified dashboard behavior`.

## Autorrevisão e execução

Cobertura conferida: contratos e integridade (1), arquitetura/acesso (2), Qualidade (3), quatro fontes e resumos (4), sete páginas/interações/acessibilidade (5), carga/performance/falhas (6), entrega/limites (7). Os cinco riscos de Review Focus têm testes nas tarefas indicadas. Assinaturas e modelos acima são compartilhados; nenhuma tarefa deve inventar endpoint alternativo.

Recomendo execução nativa nesta sessão: o fluxo depende de um contrato comum de dados e os sete entregáveis são sequenciais. Ao executar, usar superpowers:executing-plans, testes antes da implementação e revisão final independente conforme o fluxo aplicável. Plano aprovado e executado diretamente nesta sessão. Ver resultados em docs/VALIDATION.md. Validação de implantação online permanece não executada por ausência de conexão/autorização de implantação.
