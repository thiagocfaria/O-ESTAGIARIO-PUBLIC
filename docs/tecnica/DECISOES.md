[← Visão técnica](README.md) · [Arquitetura](ARQUITETURA.md) · [Confiabilidade](CONFIABILIDADE.md)

# Decisões técnicas e seus compromissos

Esta síntese explica **por que o projeto foi desenhado assim**. É uma leitura das decisões internas, não uma comparação de desempenho com fornecedores ou uma declaração de exclusividade sobre técnicas conhecidas.

## Adotar antes de reconstruir

**Decisão:** adotar → configurar → adaptar → forkar → desenvolver somente a lacuna.

**Valor:** concentrar esforço no contexto contábil, nos contratos, na validação e na experiência do usuário, em vez de recriar navegador, roteamento de modelos ou motor de workflows.

**Compromisso:** dependências precisam de avaliação de compatibilidade, manutenção e revisão das obrigações de terceiros. Uma lista de tecnologias não substitui esse trabalho por release.

## Separar autoria de execução

**Decisão:** utilizar IA onde interpretação e preparação agregam valor; repetir a rotina homologada com procedimento versionado.

**Valor:** reduzir a redescoberta do mesmo caminho e permitir testes sobre o comportamento esperado.

**Compromisso:** uma interface que muda pode exigir nova inspeção e homologação. O projeto não apresenta correção autônoma irrestrita de qualquer tela como capacidade pronta.

## Preferir os canais oficiais

**Decisão:** avaliar API e importação oficial antes da automação gráfica.

**Valor:** usar a capacidade nativa do sistema, quando disponível e adequada à operação.

**Compromisso:** acesso e cobertura variam. Quando a tela é necessária, os seletores e sinais de sucesso precisam ser descobertos e validados por rotina.

## Representar a incerteza

**Decisão:** não converter resultado desconhecido em sucesso ou dado ausente em zero.

**Valor:** a equipe enxerga a exceção e pode decidir com base no que foi realmente observado.

**Compromisso:** a automação pode parar e solicitar revisão. Esse comportamento é preferível a aparentar conclusão sem sustentação.

## Verificar o destino, não somente o executor

**Decisão:** definir sucesso de acordo com a entrega ou processamento observado, mantendo coleta, análise e apuração como responsabilidades distintas.

**Valor:** evita confundir “clicou”, “baixou”, “entregou”, “importou” e “calculou”.

**Compromisso:** cada receptor precisa de uma forma própria de confirmação. A adaptação não desaparece por usar uma ferramenta genérica.

## Promover o que foi aprovado

**Decisão:** separar desenvolvimento, homologação e produção; relacionar aceite ao mesmo artefato que será promovido.

**Valor:** a validação deixa de ser uma impressão sobre a versão e passa a se referir à entrega examinada.

**Compromisso:** backup, commit e teste verde continuam sendo coisas diferentes de deploy autorizado. A implementação dessa política deve ser conferida por ambiente.

**A contribuição do O ESTAGIÁRIO está na aplicação conjunta dessas decisões ao trabalho contábil — e nas evidências de cada rotina —, não em alegar invenção das tecnologias de base.**
