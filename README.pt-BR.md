# Quick Wishlist

*[Read in English](README.md)*

Quick Wishlist é um plugin do Obsidian para manter uma lista de desejos sem tirar a mão do teclado.

Você aperta um atalho, preenche um formulário curto e o item vira uma nota, com foto, preço e os motivos de você querer aquilo.

## Como funciona

1. **Detalhes:** nome, preço, categoria, prioridade, rank, link e loja.
2. **Foto:** cole uma imagem ou o link de uma imagem.
3. **Por que eu quero:** alguns motivos, um por linha.

Enter vai para a próxima etapa, Ctrl+Enter salva e Esc cancela.

## O que mais ele faz

- Formata o preço enquanto você digita (`6000` vira `6.000` ou `6,000`, conforme a moeda).
- Sugere as categorias e lojas que você já usou.
- Ordena os itens por um rank. Use `1.1` e `1.2` para deixar itens relacionados juntos.
- Cria uma base pronta para ver a lista: cartões com foto, por categoria, para reordenar e o que já foi comprado.
- Faz o botão "Novo" da base abrir o mesmo formulário.
- Funciona em português e em inglês.

## Comandos

| Comando | O que faz |
|---|---|
| Novo item da wishlist | Abre o formulário. |
| Criar base da wishlist | Cria a base com as visualizações da lista. |
| Marcar como comprado / voltar para quero | Leva o item aberto para Comprados, com a data de hoje, ou de volta para a lista. |
| Completar a nota atual com as propriedades da wishlist | Adiciona à nota aberta as propriedades e seções que faltam. |

Nenhum deles vem com atalho. Escolha os seus em Configurações → Atalhos.

## Formato da nota

```yaml
---
price: 6000
currency: R$
rank: 10
categories:
  - eletrônicos
priority: média
status: quero
link: https://exemplo.com/produto
store: Loja Exemplo
created: 2026-10-25
tags:
  - wishlist
---
## Foto

![[Produto.png]]

## Por que eu quero

- Primeiro motivo
- Segundo motivo
```

## Instalação

Ainda não está na loja de plugins. Por enquanto:

1. Baixe `main.js`, `manifest.json` e `styles.css` da [versão mais recente](https://github.com/vvwxx/quick-wishlist/releases/latest).
2. Coloque os arquivos em `.obsidian/plugins/quick-wishlist/`, dentro do seu vault.
3. Ative em Configurações → Plugins da comunidade e dê um atalho para "Novo item da wishlist" em Configurações → Atalhos.

Depois, rode "Criar base da wishlist" uma vez para ganhar as visualizações.

Pasta, moedas, prioridades e o resto ficam nas configurações do plugin.

## Licença

MIT
