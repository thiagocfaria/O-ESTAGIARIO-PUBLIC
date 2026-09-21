[← Visão técnica](README.md) · [Integrações](INTEGRACOES.md) · [Como avaliar](AVALIACAO.md)

# Caderno público de evidências

**Resultados com contexto valem mais que um contador de testes sem explicação.** Esta página reúne observações selecionadas das frentes do projeto, sem publicar dados de clientes ou os artefatos internos.

**Revisão das fontes: 21/09/2026.** Trata-se de uma síntese do mantenedor, não de certificação ou auditoria independente. Nesta revisão editorial, os ensaios fiscais não foram reexecutados. Os números abaixo pertencem às rodadas históricas indicadas; não atestam automaticamente a versão atual de todos os módulos.

## Classes de evidência

| Classe | Significado |
|---|---|
| **Artefato consultado** | O resultado estruturado foi aberto e conferido nesta revisão. |
| **Relatório interno consultado** | O documento registra a execução; seus dados brutos não são republicados e não houve repetição do ensaio nesta revisão. |
| **Decisão ou requisito** | Define como a solução deve operar; não é tratado como teste aprovado. |

Os IDs abaixo identificam os resumos públicos. O inventário que relaciona cada afirmação ao arquivo interno e à sua integridade fica fora deste repositório.

<a name="e01"></a>
## E01 · Retomada após efeito no laboratório Sittax

**Rodada:** 20/09/2026. **Classe:** artefatos estruturados consultados. **Ambiente:** sintético, com navegador e processo do executor.

O resultado final da suíte registra **35 testes, zero falhas, zero erros e zero ignorados**. As demonstrações consultadas complementam essa contagem:

| Demonstração | Resultado observado |
|---|---|
| Fluxo normal | Concluído; uma tentativa e uma ação. |
| Queda depois do efeito | Concluído após duas tentativas do executor; uma ação total no destino simulado. |
| Evidência insuficiente | Resultado indeterminado; uma ação e nenhum segundo acionamento. |
| Transmissão | Contador igual a zero nas três demonstrações. |

**Valor técnico:** prova um caso em que reiniciar o executor não deve repetir cegamente o efeito. Também demonstra a decisão de terminar com incerteza explícita quando a observação não permite confirmar o resultado.

**Fronteira da prova:** o destino era uma fixture. Isso não comprova login, cálculo ou transmissão no Sittax real, nem a correção de todos os módulos acrescentados depois. O número 35 não é apresentado como total corrente da suíte do produto.

<a name="e02"></a>
## E02 · Coleta real de entrada e saída na SEFAZ GO

**Registro:** relatório operacional atualizado em 20/09/2026. **Classe:** relatório interno consultado. **Ambiente:** ensaios reais controlados do robô de coleta.

O relatório registra **257 testes e 110 subtestes**, além de **três canários reais consecutivos**, com durações de **75,93 s, 65,10 s e 71,05 s**. Não somamos testes e subtestes como se fossem unidades equivalentes.

O fluxo descrito inclui consulta, geração, transferência, validação e entrega dos arquivos de entrada e saída. O documento registra conclusão das três execuções sem timeout ou reinício externo.

**Valor técnico:** vai além de um navegador que chegou à página; a observação inclui os arquivos entregues e validados no fluxo exercitado.

**Fronteira da prova:** não é SLA, benchmark de toda a carteira nem garantia de comportamento futuro do portal. Entrega dos arquivos não comprova sua importação em outro sistema. Esse robô separado também não comprova integração ponta a ponta ao O ESTAGIÁRIO.

<a name="e03"></a>
## E03 · Resumo de 5.000 XMLs sintéticos

**Rodada:** 15/09/2026. **Classe:** relatório interno consultado. **Ambiente:** análise local de dados sintéticos.

| Medição registrada | Resultado |
|---|---|
| Volume | 5.000 XMLs sintéticos |
| Primeira leitura | 2.928,05 ms |
| Releitura pelo índice após reiniciar o analisador | 757,15 ms |
| Reaproveitamento nessa releitura | 5.000 acertos no índice; zero XMLs parseados novamente |

**Valor técnico:** a medição distingue trabalho inicial de reaproveitamento, em vez de apresentar apenas a resposta mais rápida do cache. O relatório de homologação também separa testes de Core, interface e integração simulada.

**Fronteira da prova:** mede o resumo local, não download de notas, rede de escritório, processamento de portais ou throughput em produção. Não é uma promessa para qualquer máquina, documento ou volume. A metodologia é descrita, mas o benchmark completo não é reproduzível apenas com os arquivos públicos deste repositório.

<a name="e04"></a>
## E04 · Confirmação de documentos no destino

**Registro:** relatório da rodada real com revisão de encerramento em 16/09/2026. **Classe:** relatório interno consultado. **Ambiente:** importação controlada e inventário posterior.

A conferência registra **153 novos XMLs de serviços e 266 de produtos**, atribuídos às importações da rodada por cruzamento de inventário, hashes e recibos. Registra ainda **zero documentos anteriores removidos e zero alterados por hash** no conjunto comparado.

**Valor técnico:** a entrega foi confrontada com o destino, em vez de depender apenas de uma mensagem de sucesso da aplicação. Documentos já existentes não foram contabilizados como novos.

**Fronteira da prova:** esses totais não são indicadores ao vivo, garantia de todas as notas do mês ou cobertura nacional irrestrita. Não divulgamos a carteira, contribuintes, documentos, valores fiscais ou caminhos examinados.

<a name="e05"></a>
## E05 · Desktop: validar a experiência entregue

**Registro:** documentação de distribuição de 18/09/2026. **Classe:** relatório interno consultado. **Ambiente:** entrega controlada do cliente Windows.

O registro descreve validação de abertura, atualização, reabertura, acesso ao Importador e emissão/obtenção de relatório. A aprovação foi relacionada ao artefato examinado, não apenas à existência de um executável compilado.

**Valor técnico:** testa a experiência instalada, reduzindo a distância entre “o build passou” e “o usuário conseguiu usar a entrega”.

**Fronteira da prova:** não homologamos nesta página todos os ambientes Windows, políticas de TI ou requisitos de distribuição profissional. A [avaliação de implantação](AVALIACAO.md) precisa ser repetida no ambiente do piloto.

## Leitura correta dos resultados

Não agregamos essas frentes em um percentual artificial de conclusão. Elas usam versões, ambientes, fontes e objetivos diferentes. Também não extrapolamos os tempos para prometer economia financeira ou produtividade de clientes.

A parte relevante é **o tipo de prova exigida**: resultado no destino, identidade correta, efeito não duplicado nos cenários exercitados, distinção entre dados e ausência, e validação do artefato entregue.

Novas medições devem declarar a rodada, a versão sob teste, a amostra, o ambiente e os limites. Demonstrar uma rotina não libera outra. Consulte o [roadmap por critérios de aceite](../../ROADMAP.md).
