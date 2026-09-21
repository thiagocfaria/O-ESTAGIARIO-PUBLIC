<p><strong>O ESTAGIÁRIO · IA CONTÁBIO</strong><br><sub>ENGENHARIA, EVIDÊNCIAS E AVALIAÇÃO TÉCNICA</sub></p>

# Por trás da automação, um contrato de execução.

**O valor não está em ensinar uma IA a clicar. Está em conectar identidade, autorização, execução e conferência — sem perder o controle quando uma etapa falha.**

Esta área explica as decisões técnicas do O ESTAGIÁRIO para desenvolvedores, equipes de TI e responsáveis pela avaliação de um piloto. É documentação pública de alto nível: não distribui o produto, o código proprietário ou instruções de acesso aos ambientes internos.

[Apresentação do produto](../../README.md) · [Roadmap](../../ROADMAP.md) · [Segurança](../../SECURITY.md)

## Leia conforme a sua pergunta

| Pergunta | Onde encontrar a resposta |
|---|---|
| Como as partes trabalham juntas? | [Arquitetura e responsabilidades](ARQUITETURA.md) |
| O que acontece se cair depois de uma ação? | [Confiabilidade e retomada](CONFIABILIDADE.md) |
| Como os documentos viram informação verificável? | [Dados, conferência e privacidade](DADOS-E-PRIVACIDADE.md) |
| Que resultados já foram registrados? | [Caderno de evidências](EVIDENCIAS.md) |
| Quais frentes existem e qual é o seu estágio? | [Integrações e limites](INTEGRACOES.md) |
| Como avaliar um piloto sem receber o código? | [Roteiro de avaliação técnica](AVALIACAO.md) |
| Por que essas escolhas e não outra plataforma do zero? | [Decisões e compromissos](DECISOES.md) |

## O que merece atenção técnica

**Execução híbrida.** A proposta separa autoria e interpretação por IA da repetição de procedimentos aprovados. Um modelo não precisa redescobrir cada clique de um fluxo já conhecido. Essa decisão é arquitetural; a disponibilidade é demonstrada por rotina, não por slogan.

**Resultado confirmado, não apenas comando enviado.** Na coleta, um recibo isolado não substitui a conferência do documento entregue. No cálculo, um valor que já estava na tela não confirma uma nova execução. São problemas diferentes, tratados por evidências diferentes.

**Incerteza representada.** Dado ausente não vira zero. Uma ação cuja conclusão não pode ser comprovada não vira sucesso nem nova tentativa automática. A equipe recebe uma pendência explícita.

**Reuso com fronteiras.** O projeto adota componentes existentes e concentra a adaptação no contexto contábil, nos contratos e na validação. Não se apresenta como criador das bibliotecas que utiliza.

## Evidências em destaque

| Registro | O que ele sustenta |
|---|---|
| **35 testes sintéticos aprovados** na fundação Sittax | Comportamento do laboratório; inclui demonstração de queda após efeito e retomada sem segundo acionamento. [E01](EVIDENCIAS.md#user-content-e01) |
| **3 canários reais consecutivos** de coleta SEFAZ GO | Execuções completas de entrada e saída descritas no relatório operacional, não uma garantia de disponibilidade contínua. [E02](EVIDENCIAS.md#user-content-e02) |
| **5.000 XMLs sintéticos** em ensaio do resumo | Primeira leitura e reaproveitamento do índice medidos separadamente. [E03](EVIDENCIAS.md#user-content-e03) |
| **153 novos XMLs de serviços e 266 de produtos** | Conferência por inventário e hash em uma rodada controlada documentada. [E04](EVIDENCIAS.md#user-content-e04) |

## Como interpretar esta documentação

O caderno de evidências distingue **artefato consultado**, **resultado descrito em relatório interno**, **decisão arquitetural** e **critério proposto para avaliação**. Os resultados são históricos e limitados às versões e cenários examinados. Não representam uma auditoria independente ou uma reexecução dos testes na versão corrente.

A frente Sittax continua em desenvolvimento: laboratório aprovado e navegação real não equivalem a prévia fiscal ponta a ponta homologada. O [mapa de integrações](INTEGRACOES.md) deixa essa fronteira explícita.

**Revisão editorial e técnica das fontes: 21/09/2026.** Os registros brutos e a rastreabilidade detalhada permanecem privados; os resumos públicos omitem identidades de clientes e detalhes de implantação.
