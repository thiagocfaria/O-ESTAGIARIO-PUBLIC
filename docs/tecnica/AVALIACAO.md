[← Visão técnica](README.md) · [Evidências](EVIDENCIAS.md) · [Integrações](INTEGRACOES.md)

# Como avaliar o valor técnico sem receber o código

**Peça uma demonstração que prove resultado e comportamento sob falha, não apenas uma sequência de cliques.** Este é um roteiro proposto para um piloto supervisionado; não é um relato de testes já executados nem uma autorização para testar ambientes de terceiros.

## Defina um piloto pequeno e verificável

Combine uma rotina, uma empresa ou identidade sintética, um período, um conjunto conhecido de documentos e uma lista explícita de ações permitidas. Defina também o ponto de parada e quem pode autorizar eventual efeito real.

Use dados sintéticos na primeira etapa. Um teste real precisa de acesso e autorização específicos, procedimento delimitado e tratamento acordado das evidências. Não envie arquivos fiscais ou credenciais por Issues.

## Perguntas que uma boa demonstração deve responder

| O que observar | Critério de aceite proposto |
|---|---|
| Identidade | A empresa e o período do resultado correspondem ao alvo autorizado. |
| Operação | A ação realizada é a que foi autorizada, sem ampliação silenciosa do escopo. |
| Resultado | Existe prova no destino, e não somente um comando enviado ou log de sucesso. |
| Repetição | Reapresentar a mesma solicitação não cria uma segunda intenção sem controle. |
| Interrupção | Em laboratório, simular queda após efeito não produz nova ação às cegas. |
| Incerteza | Sem prova, o resultado é explicitamente parcial, pendente ou indeterminado. |
| Dados | Ausência, zero, duplicação e conflito têm tratamentos distinguíveis. |
| Evidências | Os registros ajudam a auditar sem divulgar segredos ou documentos brutos desnecessários. |

## Medir desempenho com honestidade

Compare o procedimento manual e o automatizado **sobre a mesma tarefa e o mesmo volume**. Separe preparação inicial, tempo ativo da equipe, espera do portal, execução local e conferência final. Registre também intervenções e falhas.

Não transforme um teste de cache em promessa sobre a importação inteira. Não extrapole o melhor canário para disponibilidade mensal. Qualquer conclusão de ganho deve informar o cenário e o tamanho da amostra; este repositório não publica uma economia de horas ou custos ainda não medida.

## O que a TI deve conferir

A avaliação da implantação deve cobrir as permissões necessárias, a fronteira entre dados locais e serviços externos, o armazenamento de credenciais, a retenção de logs, a atualização do cliente e a recuperação da versão anterior. A aprovação precisa identificar o artefato examinado.

Esses são itens de aceite propostos. Não se deduz que todos já foram homologados em qualquer ambiente apenas porque constam do desenho técnico.

## Entrega esperada do piloto

Um relatório de avaliação deve conter: escopo autorizado, versão examinada, amostra usada, resultado de cada cenário, tempos medidos, divergências, limitações e próximo passo. A versão pública utiliza somente informações agregadas e exemplos sintéticos; o detalhe autorizado permanece no canal reservado.

O vídeo de abertura disponível no README é **animação da marca**, não evidência de conclusão de uma rotina. As evidências técnicas existentes estão no [caderno E01–E05](EVIDENCIAS.md).

## Como iniciar uma conversa técnica

Abra uma [sugestão de rotina](https://github.com/thiagocfaria/O-ESTAGIARIO-PUBLIC/issues/new?title=Avalia%C3%A7%C3%A3o%20de%20rotina) descrevendo apenas o sistema, o trabalho manual, o resultado desejado e as restrições. Não é necessário compartilhar clientes ou código para delimitar o problema.

Disponibilidade, condições e escopo de um eventual piloto precisam ser combinados com o mantenedor. Esta página não promete acesso automático ao produto ou a ambientes privados.
