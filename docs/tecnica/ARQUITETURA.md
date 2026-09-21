[← Visão técnica](README.md) · [Confiabilidade](CONFIABILIDADE.md) · [Integrações](INTEGRACOES.md)

# Arquitetura: operar o ecossistema, não substituí-lo

**O ESTAGIÁRIO é desenhado como uma camada de coordenação entre pessoas, documentos, portais e sistemas contábeis existentes.** A separação de responsabilidades permite avaliar e evoluir uma rotina sem exigir a reescrita de todo o escritório.

Esta é uma visão lógica baseada nas decisões e contratos do projeto. Não é um mapa da rede instalada nem uma afirmação de que todas as conexões abaixo já estão disponíveis em produção.

## Responsabilidades bem definidas

| Camada | Responsabilidade e limite |
|---|---|
| **Experiência do usuário** | Receber a solicitação, apresentar estado, pendências e resultado. A interface não decide sozinha se uma ação fiscal está autorizada. |
| **Core e contratos** | Validar o escopo, representar comandos e resultados, conservar a identidade da solicitação e aplicar as fronteiras da execução. |
| **IA e autoria** | Ajudar a interpretar informações e preparar procedimentos. Uma resposta de modelo não substitui aprovação, dado de origem ou prova de conclusão. |
| **Execução e adaptadores** | Usar API, importação oficial ou receita de automação homologada para a operação. Não anunciar compatibilidade com todo o sistema porque um fluxo passou. |
| **Conferência e evidências** | Relacionar o resultado ao escopo solicitado, distinguir entrega de processamento e expor o que permaneceu pendente. |

**Caminho lógico:** solicitação delimitada → validação → procedimento autorizado → observação do destino → resultado verificável.

O caminho de exceção é igualmente importante: falha ou ambiguidade → estado preservado → reconciliação ou revisão. Uma exceção não abre permissão para a IA improvisar outra operação.

## IA na autoria; procedimento na repetição

A arquitetura híbrida distingue três momentos:

**Preparar:** inspecionar o fluxo, construir ou adaptar a receita e definir quais sinais comprovam o resultado. Nesta etapa, IA e ferramentas de inspeção ajudam o desenvolvimento.

**Executar:** receber parâmetros limitados e repetir a versão aprovada do procedimento. O desenho evita depender de uma chamada de modelo para decidir cada clique da rotina normal.

**Conferir e explicar:** produzir evidências e, quando apropriado, usar IA para apoiar a leitura delas. Os valores precisam conservar vínculo com a fonte; explicação não é prova fiscal.

Isso reduz a dependência conceitual de raciocínio por clique. **Não é uma promessa de custo zero:** execução continua consumindo máquina, rede e armazenamento, e o uso de modelos varia por configuração e tarefa.

## Base tecnológica declarada

| Área | Componentes presentes nas decisões e frentes consultadas |
|---|---|
| Experiência conversacional | LibreChat, com adaptação ao domínio do projeto. |
| Acesso a modelos | Model Gateway e LiteLLM Router como fronteira e mecanismo de roteamento. |
| Orquestração durável | Temporal nas decisões do núcleo; sua integração é verificada por fluxo. |
| Automação web | Playwright na descoberta; Robot Framework e Browser nas receitas. |
| Ambiente Windows | Cliente desktop Electron e automações cuja validação depende da aplicação e do procedimento. |
| Processamento fiscal | Core de validação e análise, com motores de coleta separados. |

Essa tabela **não é um inventário de software instalado, uma lista de versões homologadas ou um SBOM**. A stack de cada entrega precisa ser examinada no contexto da release. Pilotos separados, como os robôs SEFAZ GO e Sittax, não devem ser confundidos com integração completa ao Core.

## Limites que evitam acoplamento

O frontend consome estados e resultados tipados, não tenta interpretar mensagens de terminal como contrato. O resumo documental não redefine o sucesso de uma coleta já concluída. O robô de coleta entrega documentos; o receptor precisa confirmar a importação. A prévia é separada da transmissão.

As decisões priorizam APIs e canais oficiais de arquivo quando atendem ao processo. Automação de tela é uma adaptação por necessidade, não uma promessa de que qualquer interface será estável.

## O que fica reservado

Topologia física, endereços, portas, contas de serviço, seletores de portais, schemas executáveis, parâmetros operacionais e código dos adaptadores não fazem parte desta visão pública. O avaliador encontra aqui **responsabilidades, fronteiras e critérios**, não um procedimento para acessar ou reproduzir a implantação.

**Base:** decisões internas de automação híbrida e reuso, contratos fiscais materializados e documentação de distribuição desktop. Resultados de execução estão separados no [caderno de evidências](EVIDENCIAS.md).
