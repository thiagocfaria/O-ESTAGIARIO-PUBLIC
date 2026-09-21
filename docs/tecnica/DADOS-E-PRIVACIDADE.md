[← Visão técnica](README.md) · [Evidências](EVIDENCIAS.md) · [Segurança](../../SECURITY.md)

# Dados com origem. Ausências sem disfarce.

**Uma conferência útil precisa mostrar o que foi observado e o que ainda não pode ser afirmado.** Esse é um dos diferenciais de engenharia do resumo documental descrito nas fontes do projeto.

## Semântica de conferência

| Caso | Tratamento descrito no contrato do resumo |
|---|---|
| Valor explícito igual a zero | Distinguir de campo ausente ou inválido. |
| Informação não encontrada | Manter como não observada ou não confirmada, sem inventar zero. |
| Somente parte dos documentos é aproveitável | Exibir subtotal observado e caráter parcial. |
| Cópias do mesmo documento | Identificar duplicação antes de somar. |
| Mesma identidade com conteúdo fiscal divergente | Sinalizar conflito, em vez de escolher arbitrariamente um valor. |
| Documento de outra empresa ou competência | Não incluí-lo nos totais do escopo consultado. |

O contrato também separa entradas e saídas de produtos, serviços prestados e tomados e evidências de eventos. Cancelamento ou substituição só altera a leitura quando existe evidência compatível. O resumo **não comprova, por si só, que todas as notas do período foram obtidas**.

## Valores calculados por código; interpretação com contexto

A documentação do resumo descreve aritmética decimal no servidor e preservação da representação monetária na interface. Os totais são acompanhados de estado de observação, em vez de serem produzidos por uma resposta livre de modelo.

Isso facilita revisar a origem dos números. Não significa substituir uma apuração oficial ou inferir responsabilidade tributária apenas pela presença de um campo no XML. A leitura de valores documentais e a interpretação profissional continuam sendo atividades diferentes.

## Conferir entrega também é engenharia de dados

Na rodada de importação documentada, a confirmação cruzou inventário de arquivos, hashes e recibos para distinguir documentos novos de documentos já existentes. O número exibido não foi sustentado apenas pelo log do botão. [E04](EVIDENCIAS.md#user-content-e04)

Esse princípio ajuda a responder duas perguntas diferentes: **“O processo terminou?”** e **“O material esperado chegou ao destino?”**.

## Fronteiras de acesso

O contrato do resumo prevê resolução de fontes no servidor, restrição a destinos aprovados e validação do escopo antes da análise. Também declara que XML bruto, credenciais, certificados e caminhos locais não devem ser retornados à interface como resultado do resumo.

São propriedades descritas para essa frente. Elas não constituem uma afirmação de isolamento universal em todos os módulos nem substituem a revisão das permissões de cada implantação.

## Local, servidor e provedores de IA

O projeto combina operações locais e serviços de servidor. A camada de IA pode usar provedores externos conforme a configuração. Portanto, **“arquivos processados localmente” não equivale a “nenhum dado sai do ambiente”**.

Antes de um piloto, a avaliação deve registrar quais informações são processadas, quem pode acessá-las, se existe envio a provedores, quais logs são retidos e por quanto tempo. Esse mapeamento é um critério de implantação; esta área não declara conformidade regulatória ou certificação de privacidade.

## O que não publicamos

Exemplos reais de documentos, identidades de clientes, capturas do painel com dados fiscais, configurações de contas, credenciais e diagnósticos internos não são necessários para explicar o valor técnico. Os resultados desta vitrine são agregados ou sintéticos, com os limites da prova indicados.

**Base:** contrato interno do resumo XML e relatórios de validação. Veja [E03 e E04](EVIDENCIAS.md) para distinguir ensaio sintético e rodada real documentada.
