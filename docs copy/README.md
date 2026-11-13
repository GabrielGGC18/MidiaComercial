# MidiaComercial: documentação da primeira entrega (Hackrun)

**Inteligência comercial para pequenos lojistas.** *Seus sinais de venda, em uma só mídia.*

Esta pasta reúne a **primeira entrega** do Hackrun: planejamento e definição técnica. Ela não é a entrega final do MVP.

| # | Requisito da entrega | Documento |
| --- | --- | --- |
| 1 | Proposta e estrutura inicial das telas | [01-PROPOSTA-E-ESTRUTURA-DAS-TELAS.md](01-PROPOSTA-E-ESTRUTURA-DAS-TELAS.md) |
| 2 | Documentação inicial do projeto | [02-DOCUMENTACAO-INICIAL.md](02-DOCUMENTACAO-INICIAL.md) |
| 3 | Linguagem de programação escolhida | [03-LINGUAGEM-DE-PROGRAMACAO.md](03-LINGUAGEM-DE-PROGRAMACAO.md) |
| 4 | Arquitetura proposta | [04-ARQUITETURA-PROPOSTA.md](04-ARQUITETURA-PROPOSTA.md) |
| 5 | Plataforma e tecnologias adotadas | [05-PLATAFORMA-E-TECNOLOGIAS.md](05-PLATAFORMA-E-TECNOLOGIAS.md) |
| 6 | Como a tecnologia ou prática sorteada será incorporada | [06-TECNOLOGIA-SORTEADA.md](06-TECNOLOGIA-SORTEADA.md) |
| 7 | Evolução: período por nicho, faixa etária, voz, base de clientes e agente de vendas | [07-EVOLUCAO-AGENTE-PUBLICO.md](07-EVOLUCAO-AGENTE-PUBLICO.md) |
| 8 | Design: geometria reta, efeitos React Bits e telas mais intuitivas (proposta) | [08-DESIGN-GEOMETRIA-E-EFEITOS-REACT-BITS.md](08-DESIGN-GEOMETRIA-E-EFEITOS-REACT-BITS.md) |

## Resumo em uma tela

- **Problema:** o lojista tem sinais espalhados (o que vendeu, o que procuraram e não tinha, o que há no estoque) e nenhuma rotina para transformá-los em decisões verificáveis.
- **Solução:** uma camada ao lado do PDV que importa vendas e estoque, registra a demanda não atendida no balcão e entrega até 3 oportunidades com evidência, amostra e limitação, acompanhando a ação escolhida.
- **Diferencial:** observar compras **e não compras**, decidir e medir.
- **Stack:** Python 3.12 · Django 5 + Django Ninja · PostgreSQL 16 · React + TypeScript + Tailwind v4 + shadcn/ui (design system Mídia UI) · Docker · Caddy · Hostinger VPS.
- **IA:** agente que ajuda a preencher dados; ele propõe e uma pessoa confirma.
- **Dados da demo:** 100% sintéticos.
