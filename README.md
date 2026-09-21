<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/estagiario-lockup-light.png">
    <img src="./assets/estagiario-lockup-dark.png" alt="O ESTAGIÁRIO — IA CONTÁBIO" width="620">
  </picture>
</p>

<h1 align="center">O ESTAGIÁRIO</h1>
<p align="center"><strong>IA CONTÁBIO — automação que trabalha nos sistemas que o escritório já usa.</strong></p>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-em%20desenvolvimento-f59e0b?style=for-the-badge">
  <img alt="Código" src="https://img.shields.io/badge/código-proprietário-111827?style=for-the-badge">
  <img alt="Foco" src="https://img.shields.io/badge/foco-automação%20contábil-2563eb?style=for-the-badge">
</p>

<p align="center">
  <a href="./assets/estagiario-splash.mp4"><strong>▶ Assistir à animação do O ESTAGIÁRIO</strong></a>
</p>

---

## Não é mais um sistema contábil

O ESTAGIÁRIO foi pensado para **operar o ecossistema que o escritório já possui**: portais fiscais, sistemas contábeis, importadores, rotinas web e processos repetitivos.

Em vez de exigir que o escritório troque tudo, a proposta é conectar IA + automação às ferramentas existentes e transformar tarefas manuais em fluxos rastreáveis, repetíveis e supervisionáveis.
## O que estamos construindo

- **Automação fiscal e contábil** para rotinas repetitivas de escritório.
- **Robôs determinísticos** para navegar e executar procedimentos aprovados.
- **IA como supervisora e autora**, sem depender de um modelo decidindo cada clique em produção.
- **Integração com sistemas existentes**, priorizando APIs e importações oficiais antes de automação de tela.
- **Retomada e evidência operacional**, para que uma falha não vire trabalho duplicado silencioso.
- **Operação multiempresa**, com identidade de cliente e competência tratadas como parte do contrato da automação.

## Princípio central

> **O ESTAGIÁRIO não quer substituir o contador nem o sistema contábil. Quer eliminar o trabalho repetitivo entre eles.**

O objetivo é que atividades como coleta de documentos, conferência, importação, preparação de prévias e acompanhamento de rotinas deixem de depender de cliques manuais repetidos.

## Demonstração

A animação oficial usada pelo aplicativo desktop está disponível aqui:

**[▶ Abrir estagiario-splash.mp4](./assets/estagiario-splash.mp4)**

Este repositório é a vitrine pública do projeto. O código-fonte do produto não é publicado aqui.
## Arquitetura em alto nível

```text
Documentos / portais / sistemas existentes
                 │
                 ▼
        O ESTAGIÁRIO — Core
                 │
        ┌────────┴────────┐
        ▼                 ▼
   IA / supervisão   Robôs aprovados
        │                 │
        └────────┬────────┘
                 ▼
      Resultado + evidência
```

A implementação privilegia componentes maduros e reutilizáveis. Automatização de tela entra quando não existe um canal oficial melhor.

## Estado do projeto

O ESTAGIÁRIO está em desenvolvimento ativo. Existem pilotos e componentes já exercitados em laboratório e em fluxos reais controlados, mas este repositório **não deve ser interpretado como promessa de disponibilidade geral ou homologação de produção**.

Veja o [roadmap público](./ROADMAP.md) para acompanhar a direção do projeto.

## Sobre este repositório

Este repositório público contém **somente material de apresentação e identidade visual**. Não contém o código-fonte proprietário, credenciais, certificados, configurações de clientes ou artefatos fiscais.

Marcas e serviços de terceiros eventualmente mencionados pertencem aos seus respectivos titulares; não há afiliação implícita.

---

<p align="center"><strong>Se a ideia de uma IA que trabalha dentro do ecossistema contábil faz sentido para você, deixe uma ⭐.</strong></p>
