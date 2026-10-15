# Validação do DashPRO

Data: 15/10/2026. Código de produção somente leitura; sem publicação remota efetuada.

## Evidências já obtidas

- Regras de esquema: identificadores, fórmulas auxiliares, duplicidades, cabeçalhos repetidos, datas e números inválidos.
- Leitura Apps Script: testes com fronteira SpreadsheetApp simulada; uma leitura em lote por aba, isolamento de erros e serialização. Isso não substitui execução no Google.
- Cobertura: conjuntos distintos, coorte BASE, filtros de eventos independentes do denominador, pares e conflitos de resultado.
- Interface: sete páginas, multisseleção, cliques em gráficos, paginação, segurança de texto/CSV, teclado, movimento reduzido e viewport móvel.
- Atualização: carga única, conservação dos dados na falha, resposta antiga ignorada e filtros preservados com aviso de valores removidos.

## Reconciliação com o arquivo enviado

| Fonte | Registros elegíveis |
|---|---:|
| BASE | 2.851 |
| REPOSIÇÔES | 1.352 |
| LINK | 37.701 |
| QUALIDADE | 967 |
| AsakaiDash | 37 valores com rótulo adjacente |
| Página5 | 960 artigos com produção numérica |

Qualidade inteira: 916 aprovados e 51 reprovados; aprovação por evento 94,73%. Para a coorte integral da BASE, cobertura OP 27/1.749 = 1,54%; cobertura solicitação 39/1.505 = 2,59%. Há 26 pares OP/solicitação correspondentes e 312 registros da BASE sem chave válida de solicitação. A aprovação vinculada à coorte é diferente da aprovação global.

Asakai preserva pares de rótulo/valor adjacentes da região A:BK; não reconstrói tabelas históricas sem relação explícita de cabeçalhos. O painel mostra origem de célula e não soma unidades distintas.

A amostra tem um erro de data em BASE!AF2633 que openpyxl reporta como fora da faixa. O importador preserva o erro como diagnóstico de dado inválido. O Excel e snapshots reais não são versionados nem incluídos no pacote de entrega.

## Desempenho medido em navegador

Chromium 154.0.8037.57, Node v24.19.0, Linux x64, AMD EPYC 9V74, 5 CPUs lógicas disponíveis. 40 ações de filtro após aquecimento, incluindo atualização do DOM e layout; duração da animação excluída. Rede local, sem simulação de conexão móvel.

| Dados | Payload JSON | Abertura local | p95 filtros | Chamadas de dados |
|---|---:|---:|---:|---:|
| Sintéticos com volume representativo | 5.635.679 bytes | 414 ms | 59,2 ms | 1 |
| Arquivo enviado, snapshot projetado | 10.865.866 bytes | 756 ms | 130,1 ms | 1 |

Os dois testes ficaram abaixo de 200 ms. Esses tempos não incluem leitura remota do Google Sheets, autenticação ou cotas do Apps Script. Não estabelecem tempo de abertura no Google nem desempenho em outra máquina.

## Verificação final

Execução integrada confirmada:

- `npm test`: 27 testes aprovados; zero falhas ou testes ignorados.
- `npm run test:ui -- --reporter=line`: 13 testes aprovados em Chromium; zero falhas.
- `npm run check`: oito unidades JavaScript analisadas; includes resolvidos e manifesto somente leitura validado.
- `npm run benchmark`: p95 59,2 ms com volume sintético representativo.
- `node scripts/benchmark.cjs .local/snapshot.json`: p95 130,1 ms com o arquivo enviado.
- `npm run package`: entrega compacta gerada com código, HTML, manifesto e instruções; não inclui o Excel ou snapshots reais.
- `git diff --check`: sem erros de whitespace.

Os testes novos foram executados primeiro em estado de falha e depois aprovados, com exceção de casos que já verificavam comportamento existente e configuração/empacotamento reversível. A revisão independente do conjunto será registrada em complemento após a leitura final.

## Não executado online

- Autorização OAuth da conta Google e leitura real via SpreadsheetApp.
- Publicação de Web App e verificação das permissões de público/execução.
- Tempo de abertura frio/quente do Google; meta quente inicial <=5 s ainda não validada.
- Verificação em uma tarefa nova/restauração de snapshot de ambiente.

A sessão não possui conector de implantação Apps Script. A tentativa de leitura HTTP do Sheets retornou 403 na rede do ambiente. O código e a documentação permitem instalar com a conta Google autorizada, sem pedir tokens ou senhas no chat.
