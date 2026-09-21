[← Visão técnica](README.md) · [Evidências](EVIDENCIAS.md) · [Avaliação](AVALIACAO.md)

# Confiabilidade: o erro não pode virar trabalho duplicado

Uma rotina pode falhar antes de enviar uma ação, durante o processamento ou depois de o destino concluir, mas antes de o robô receber a resposta. O projeto trata esses momentos de forma diferente.

## Comportamentos que importam

| Situação | Critério de engenharia |
|---|---|
| Empresa ou competência divergem | Interromper antes do efeito; não escolher uma alternativa por aproximação. |
| Mesma solicitação reaparece | Preservar sua identidade e consultar o estado, em vez de criar outra intenção silenciosamente. |
| Queda após uma ação possível | Reconciliar no destino antes de admitir repetição. |
| Não existe prova suficiente | Expor resultado indeterminado; não afirmar sucesso. |
| Duas operações disputam o mesmo escopo | Aplicar exclusão compatível com o executor e a implantação. |
| Um resumo falha depois de uma coleta concluída | Relatar falha da análise sem apagar ou reinterpretar a entrega confirmada. |

Esses critérios aparecem nas implementações e contratos consultados, com níveis de validação diferentes. A fundação Sittax foi exercitada em laboratório; a coleta SEFAZ GO possui ensaios reais documentados. [E01 e E02](EVIDENCIAS.md)

## O caso decisivo: efeito ocorreu, resposta se perdeu

A demonstração sintética Sittax examinada produziu uma ação, interrompeu o processo e retomou a solicitação. O resultado final mostrou **duas tentativas do executor e apenas uma ação no destino simulado**. Isso sustenta o comportamento de reconciliação naquele cenário, não uma garantia universal de execução única em serviços externos. [E01](EVIDENCIAS.md#user-content-e01)

Idempotência local não obriga um portal de terceiros a ser idempotente. Por isso, preservar estado e observar o destino são partes complementares do desenho.

## Sucesso precisa ter uma definição por operação

**Coleta:** encontrar documentos íntegros e compatíveis no destino aprovado. Um arquivo parcial, um resumo de documento ou uma confirmação de geração não são equivalentes à entrega.

**Conferência:** apresentar totais observados e pendências sem transformar ausências em zero ou somar duplicatas como novos documentos.

**Prévia:** associar os valores à empresa, à competência e à execução solicitada. Uma tela antiga com valores calculados não basta. Essa prova nativa ainda é requisito para a homologação da prévia real Sittax.

**Desktop:** abrir um processo não equivale a entregar uma janela utilizável. O relatório de distribuição consultado descreve conferência da abertura e reabertura do aplicativo. [E05](EVIDENCIAS.md#user-content-e05)

## Observabilidade para melhorar sem adivinhar

A telemetria da coleta separa duração por etapa, tentativas e espera humana. Isso permite distinguir tempo de navegação, espera da fonte, transferência e validação. O objetivo é corrigir o gargalo observado, não reduzir timeouts indiscriminadamente.

Para um piloto, devem ser avaliados tempo total, tempo por etapa, pendências, ações efetivamente executadas e necessidade de intervenção. O [roteiro de avaliação](AVALIACAO.md) propõe como registrar isso sem expor dados reais em público.

## Qualidade de uma entrega

A política operacional define **DEV → HOMO → PROD**, com promoção do mesmo artefato aprovado e aprovação vinculada à sua identidade. Commit, backup e teste verde não são autorização de deploy.

Essa é a política declarada. Não afirmamos que todos os pipelines e todos os ambientes já implementam integralmente cada etapa: o aceite da entrega precisa verificar a implantação concreta.

**Limites públicos:** não anunciamos disponibilidade garantida, retomada distribuída universal, ausência total de duplicações ou operação autônoma em qualquer portal. Os resultados publicados descrevem exatamente a classe de teste e o escopo observado.
