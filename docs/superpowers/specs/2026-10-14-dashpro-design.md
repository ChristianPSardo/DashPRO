# DashPRO — especificação do dashboard corporativo

Data: 14/10/2026. Estado: especificação e plano aprovados pelo usuário; implementação em andamento.

## 1. Objetivo e escopo aprovado

Criar um Web App em Google Apps Script, em português, para analisar solicitações de reposição, execução, produção e auditorias. O dashboard deve oferecer uma carga inicial de dados por abertura, filtros múltiplos locais, gráficos interativos com animações e detalhe rastreável até a aba e linha de origem.

O usuário confirmou que BASE é o universo principal da cobertura da Qualidade. LINK contextualiza produção e nunca compõe o denominador dessa cobertura. A aplicação é somente leitura: não altera células, fórmulas, permissões ou registros da planilha.

Fonte online: planilha `1ExgwfrUZy9a_aKla_Q4qgfgCY3Rm5cCchDMxPcYU05g`. A análise inicial foi feita no arquivo enviado `Dashonline (1).xlsx`, pois a rede da sessão retornou 403 para Google Sheets. O arquivo é uma referência de estrutura e validação, não substitui a conexão online na entrega.

## 2. Decisão de arquitetura

Adotar Apps Script com HtmlService e JavaScript no navegador. É a opção alinhada à hospedagem solicitada e evita manter servidor externo. Um frontend hospedado separadamente acrescentaria infraestrutura; Looker Studio não atende da mesma forma à interface personalizada e à interação local solicitada. Essas alternativas ficam fora do escopo.

Componentes:

- `Code.gs`: entrega HTML e expõe um único endpoint de leitura, sem aceitar IDs arbitrários de planilha enviados pelo navegador.
- `DataService.gs`: abre a planilha configurada, lê cada intervalo operacional em lote e constrói o snapshot. Não usa chamadas por célula.
- `Schema.gs`: contratos de colunas, identificação de linhas operacionais, normalização de chaves e diagnósticos de dados.
- `Index.html`, `Styles.html` e `App.html`: estrutura, visual e controle de interação.
- `Analytics.html`: funções puras para filtros, agregações e cobertura; a mesma lógica é exercitada nos testes locais.
- `Charts.html`: gráficos SVG leves, acessíveis e animados, sem depender de CDN para renderizar.

O endpoint devolve apenas JSON serializável, sem objetos Date. Datas de calendário usam YYYY-MM-DD e instantes usam ISO; exibição e limites de dia seguem o fuso da planilha, informado no snapshot. A interface informa o horário da leitura e da conclusão, pois leituras entre abas não são transacionais.

Uma chamada `google.script.run` carrega o snapshot após o HTML inicial. A leitura inclui somente colunas necessárias ao dashboard. O cliente mantém o snapshot em memória e aplica todos os filtros sem novas chamadas. Não persiste os dados em localStorage. Atualizar dados faz uma nova chamada explícita e substitui o snapshot somente após sucesso.

Não depender de CacheService para comportar toda a base. Índices em memória no cliente e dados tabulares compactos reduzem custo e volume. Se a carga ultrapassar os limites de execução ou resposta do Apps Script, exibir erro diagnosticável; não truncar resultados ou carregar silenciosamente apenas parte das abas.

## 3. Contratos de dados

Preservar valor original, chave normalizada e referência de origem nos campos usados em relacionamentos. Normalizar espaços, caixa e identificadores numéricos sem adicionar `.0`; preservar zeros iniciais de identificadores textuais. Vazio, hífen e zero não são chaves válidas. Não fazer correspondência aproximada de OP ou solicitação.

### BASE

Uma linha elegível possui ID ITEM e OP. ID ITEM identifica o item declarado, mas não é chave única garantida. Na amostra existem 2.851 linhas elegíveis e 2.032 IDs distintos: não remover linhas repetidas automaticamente. Exibir contagem de registros e itens distintos como medidas diferentes.

Campos: ID ITEM, DATA SOLICITAÇÃO, MACRO-FASE, OP, ARTIGO, ROTA, GRUPO, DESC. REPOSIÇÃO, MOTIVO, MOTIVO ESPECÍFICO, ÁREA CAUSADORA, PLANO, UND. CORTE, FASE, EMBARQUE, MARCA, PÇS TOTAL, FALTA TOTAL, DATA DO ENVIO, SITUAÇÃO, BLOCO, DATA SUSPENSÃO, ANÁLISE PCP, ARITGOSIGLA, SOLICITAÇÂO, AUDITORIA SOL e AUDITORIA OP. E-mail e observações livres não são enviados ao cliente por não serem necessários aos indicadores aprovados.

Contagens distintas de OP e solicitação usam suas próprias chaves. Somas de FALTA TOTAL são rotuladas como peças solicitadas por registro; PÇS TOTAL não é somado como volume único de OP, pois pode se repetir em itens diferentes.

### REPOSIÇÔES

Uma linha operacional possui ORDEM e DATA. Campos: motivo, filial, status PCP, data, ordem, solicitação, embarque, total de peças, tipo, item, consumo KG, status e datas de depósito/corte/CD/envio/recebimento. A OP normalizada remove somente sufixo terminal numérico entre parênteses, como `8823 (1)`; o original permanece no detalhe.

Contagens de registros e solicitações distintas são separadas. Total de peças e consumo representam soma das linhas de itens, não volume único de OP. Não juntar tabelas e depois somar valores, evitando multiplicação por relações muitos-para-muitos.

### LINK

Campos: Solicitacao, Ordem, SgUnidade, Plano, Embarque, Prog, QtFase, DtFim, Artigo, Desc Artigo, Ds Tipo de Ordem, Negocio, Categoria, Grupo Coml, Colecao, Evento, Turno da coluna AH, Linha, SAFL-QtPCON, SAFL-QtSegQld e SAFL-QtSaldos.

Há dois cabeçalhos Turno: o contrato usa AH, correspondente ao campo apresentado na análise inicial; BF não é intercambiável. A validação confere a posição e o cabeçalho. Produção soma SAFL-QtPCON como peças apontadas por registro; não apresenta esse valor como volume físico único de OP sem evidência de granularidade. OPs e solicitações são contadas distintamente.

### QUALIDADE

A coluna A sem cabeçalho é data de auditoria. B: ORDEM; C: SOLICITAÇÃO; D/E: turnos auditado/produzido; F/G/H: pesos solicitado/corte/auditado; I: STATUS; J: Parte; L: OT CRUZADA; M: Duplicada; N/O: AUDITADA SOL/OP. Ignorar blocos de resumo em P/Q.

Um evento de auditoria elegível tem OP ou solicitação válida e STATUS APROVADO ou REPROVADO. Flags existentes são informação auxiliar, não prova de auditoria. Repetições podem representar partes ou reinspeções; preservar eventos e calcular cobertura por conjunto de identificadores.

### AsakaiDash e Página5

São fontes de resumos, não eventos adicionais. Asakai apresenta blocos com rótulos e valores encontrados na região A:BK, com endereço de célula, agrupamento por bloco e identificação explícita como valores do resumo original. Não inferir histórico de células sem data. Não somar esses valores aos totais da BASE.

Página5 usa A:E: Artigo, Produzido, Solicitado e percentual original; ignora o segundo cabeçalho F:I sem registros na amostra. Aceita somente linhas com artigo não vazio e valores numéricos. Exibe produzido, solicitado e peças solicitadas por mil produzidas: 1000 × Solicitado / Produzido, com unidades visíveis. Produzido zero resulta em Sem base. Não confundir essa medida com contagem de solicitações por mil peças.

## 4. Regras da Qualidade

Para a coorte de linhas da BASE após filtros:

- Cobertura por OP = OPs distintas da coorte presentes em eventos elegíveis de QUALIDADE / OPs distintas válidas da coorte.
- Cobertura por solicitação = solicitações distintas da coorte presentes em eventos elegíveis de QUALIDADE / solicitações distintas válidas da coorte.
- Solicitações sem chave são exibidas como registros sem identificador, fora do denominador por solicitação.
- A correspondência por solicitação isolada não prova que toda combinação de OP e solicitação foi auditada. Mostrar também o diagnóstico de pares exatos, sem substituir a fórmula aprovada por uma relação diferente.
- Uma solicitação com várias auditorias conta uma vez na cobertura. Eventos permanecem disponíveis no detalhamento.
- Denominador zero exibe Sem base; nunca 0% ou infinito.

O período principal da página Qualidade filtra DATA SOLICITAÇÃO da BASE. A cobertura procura auditorias da coorte existentes no snapshot, independentemente da data de auditoria. Rotular como “Auditada em algum momento até esta leitura”. Eventos com data ausente, inválida ou futura continuam comprovando a presença de um registro com resultado, mas são sinalizados e não entram em tendências ou prazos. Isso evita apresentar datas inválidas como auditorias cronologicamente confirmadas.

A atividade de auditoria tem um período separado, claramente rotulado por data de auditoria. Aprovação por evento = APROVADO / (APROVADO + REPROVADO) entre eventos selecionados. Na página Qualidade, eventos vinculados à coorte usam correspondência por solicitação; na ausência de solicitação válida no evento, usam OP. Mostrar esse critério na ajuda do indicador. Eventos sem correspondência com toda a BASE aparecem em diagnóstico separado e não aumentam a cobertura.

Resultado mais recente por par OP/solicitação usa apenas datas válidas até a leitura; em empate de instante, resultados conflitantes são rotulados Conflitante. Não inventar ordem temporal pela posição da linha. Eventos sem cronologia válida são contabilizados separadamente. Reinspeção é a existência de mais de um evento por par, sem afirmar que se trata de erro de duplicação.

Não fixar meta de cobertura ou aprovação sem meta fornecida pelo usuário.

## 5. Páginas e indicadores

| Página | Indicadores | Gráficos e detalhe |
|---|---|---|
| Visão geral | Registros, itens distintos, OPs, peças solicitadas por registro, cobertura da BASE | Evolução mensal, causas, áreas e situação PCP |
| Solicitações | Registros, OPs, solicitações distintas, peças e registros sem chave | Pareto de motivos, áreas causadoras, macrofase e tabela |
| Reposições | Registros, solicitações, peças por item, consumo KG válido, mediana de prazo | Status por etapa, evolução, tipos e exceções de prazo |
| Produção | Peças apontadas, OPs e solicitações distintas, segunda qualidade apontada | Evolução por DtFim, unidade, negócio, coleção e artigo |
| Qualidade | Coberturas OP/solicitação, não auditadas, aprovação por evento, reinspeções | Auditadas versus não auditadas, evolução, resultados por turno e lista sem auditoria |
| Asakai | Valores dos blocos do resumo | Blocos legíveis com origem; sem totais cruzados com outras bases |
| Artigos | Produzido, solicitado e peças solicitadas por mil produzidas | Ranking por artigo, comparação de volumes e tabela |

Prazo de reposição é dias de DATA até RECEBIMENTO SLMB, apenas quando ambas são válidas, não futuras e fim >= início. Exibir número de registros elegíveis e excluídos. Pendências são status operacionais abertos explicitamente reconhecidos; cancelados ficam separados. Na BASE, SITUAÇÃO e ANÁLISE PCP permanecem dimensões diferentes; não classificar automaticamente todos os registros ANALISE como pendentes, pois a análise PCP pode indicar ATENDIDA.

## 6. Interações e direção visual

Layout claro com navegação lateral azul-marinho, tipografia de sistema, bordas discretas e cores semânticas consistentes: azul para volume, verde para aprovado/auditado, âmbar para pendências, vermelho para reprovado. A referência é a hierarquia do estudo Airtable do Awesome DESIGN.md, adaptada a um painel operacional, sem copiar marca.

Filtros contextuais com seleção múltipla, pesquisa, Selecionar todos, Limpar e chips removíveis. Dentro de uma dimensão, seleção opera com OU; entre dimensões, com E. Filtros sem seleção restringem a zero resultados; Limpar restaura todas as opções. Trocar de página preserva o estado de filtros daquela página; um botão restaura o padrão. O padrão inclui todo o período disponível, mostrando sua extensão.

Filtros de BASE: período, macrofase, área, motivo, unidade de corte, fase, bloco, situação, análise PCP, OP e solicitação. Reposições: período, filial, tipo, motivo e status por etapa. Produção: período, unidade, negócio, coleção, turno, linha e artigo. Qualidade herda a coorte BASE e oferece resultado/turno no painel de eventos; filtros de resultado nunca removem registros do denominador da cobertura. Artigos usa pesquisa e seleção de artigo. Asakai usa seleção de bloco.

Clicar em categoria de gráfico alterna sua seleção no filtro correspondente. Gráficos de tempo oferecem seleção do período; tooltips apresentam valor, unidade e base de cálculo. Categorias extensas usam top 10 mais Outros, e Outros corresponde ao conjunto real das categorias restantes. Gráficos de cobertura abrem a lista correspondente sem recalcular o denominador a partir da lista.

Tabelas paginadas de 50 linhas, ordenação e exportação CSV do recorte completo. Exportação protege células textuais iniciadas por caracteres de fórmula. Exibir texto das células com textContent, nunca HTML recebido da fonte. Navegação por teclado, foco visível, rótulos de campos, alternativa tabular para gráficos e respeito a prefers-reduced-motion. Animações entre 150 e 250 ms; nenhuma impede interação.

## 7. Integridade, falhas e acesso

Normalizar rótulos sem reescrever a fonte. Célula Date em campo numérico é anomalia, não número; datas fora da faixa ou futuras são diagnosticadas. Valores inválidos são excluídos somente das medidas que dependem deles, com contagem e motivo visíveis. Fórmulas sem resultado útil não criam eventos. Flag de duplicação não exclui auditorias automaticamente.

Campos obrigatórios ausentes bloqueiam a página afetada e indicam aba/campo. As demais páginas continuam disponíveis quando seus contratos são válidos. Aba opcional de resumo ausente gera estado indisponível, não zero. Falha de acesso à planilha bloqueia a carga com mensagem clara; falha de atualização mantém o snapshot anterior, marcado como desatualizado.

Configuração por Script Properties para o ID da planilha, com valor padrão documentado para a fonte solicitada. Escopos mínimos de leitura. Recomendar implantação executando como usuário que acessa e acesso restrito à organização, de acordo com as opções reais da conta. Nunca publicar acesso anônimo como padrão. Testar com uma conta autorizada; não presumir permissões de implantação a partir da leitura do Excel.

## 8. Validação e critérios de aceite

- Testes unitários: chaves, espaços, zeros iniciais, sufixos de OP, linhas de fórmula, datas inválidas, valores numéricos, denominador zero e correspondência por OP/solicitação/par.
- Cobertura: casos com múltiplas auditorias, uma OP em várias linhas, solicitação ausente, conflito de resultados, auditoria futura e auditoria fora do período da coorte. Cobertura nunca excede 100%.
- Integração local com o Excel: reconciliar contagens por regra de elegibilidade, aprovação de 916/967 eventos e justificar diferenças por filtros ou dados. Não usar as interseções exploratórias como resultados finais sem reaplicar as regras desta especificação.
- Navegador: todas as páginas, multisseleção, cruzamento de filtros, clique em gráfico, exportação, paginação, estados vazios e erros. Confirmar zero chamadas de dados durante filtros e troca de páginas.
- Desempenho local: medir tamanho do payload, transformação e renderização. Meta de resposta aos filtros: p95 <= 200 ms após aquecimento, com a amostra fornecida, excluindo a duração visual da animação; registrar máquina e navegador. Se a meta falhar, otimizar antes de concluir.
- Apps Script online: autorizar leitura, executar endpoint com dados reais, abrir Web App e medir carga fria/quente; meta inicial até 5 s em carga quente, a confirmar no ambiente Google. Não prometer tempo de rede absoluto nem descrever testes locais como validação de implantação.

## 9. Entrega e limites

Entregar código Apps Script completo, manifesto, documentação de instalação/implantação, testes e relatório de validação. O Excel com dados operacionais fica fora dos arquivos versionados. Fixtures de teste devem ser sintéticas, sem e-mails ou observações originais.

Não há conector de Google Apps Script nem autenticação de implantação disponível nesta sessão. A implementação poderá ser validada localmente; se essa limitação persistir, a implantação online dependerá de executar os passos documentados na conta Google autorizada, com a validação online explicitamente pendente.

MagicPath, Floot, Lovable e Wolfram foram solicitados, mas não expõem ferramentas nesta sessão; não há alegação de uso. Superpowers orienta o fluxo, Awesome DESIGN.md orienta a referência visual, Taste será aplicado na implementação da interface e Karpathy orienta simplicidade e verificabilidade.
