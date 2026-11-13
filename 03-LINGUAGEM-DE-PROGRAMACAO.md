# 03. Linguagem de programação escolhida

**Projeto:** MidiaComercial
**Data:** 13/11/2026

---

## 1. Decisão

| Camada | Linguagem | Versão |
| --- | --- | --- |
| **Backend, motor de regras e agente de IA** | **Python** | 3.12 |
| **Frontend (interface web)** | **TypeScript** (com React) | 5.x |
| Banco de dados | SQL (PostgreSQL, via ORM do Django) | PostgreSQL 16 |

## 2. Por que Python no backend

| Critério | Como o Python atende |
| --- | --- |
| **Domínio da equipe** | É a linguagem que a equipe mais conhece; em 48 h, produtividade pesa mais que novidade |
| **Framework maduro** | Django traz autenticação, ORM, migrações e painel admin prontos |
| **API moderna** | Django Ninja oferece o estilo do FastAPI (type hints, Pydantic, OpenAPI automático) dentro do Django |
| **Dados e cálculo** | `decimal.Decimal` para dinheiro sem erro de arredondamento; `csv` da biblioteca padrão; pandas disponível se precisar |
| **Validação** | Pydantic valida cada linha do CSV e cada proposta do agente com mensagens claras |
| **IA** | Os SDKs de LLM têm suporte de primeira linha em Python, o que facilita o agente de preenchimento |
| **Testes** | pytest + pytest-django são simples e rápidos para testar regras e isolamento |

### Exemplo do estilo adotado

```python
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class EvidenciaCandidata:
    fonte: str  # "vendas" | "demanda" | "estoque"
    descricao: str  # "9 procuraram e não tinha"
    valor: Decimal | int
    amostra: int


def ticket_medio(receita: Decimal, pedidos: int) -> Decimal | None:
    """Receita ajustada ÷ pedidos concluídos. Sem pedidos, não há ticket."""
    if pedidos == 0:
        return None
    return (receita / pedidos).quantize(Decimal("0.01"))
```

## 3. Por que TypeScript no frontend

| Critério | Como o TypeScript atende |
| --- | --- |
| **Ecossistema React** | shadcn/ui, TanStack Query, React Router e Recharts são escritos em TypeScript |
| **Contrato com o backend** | O Orval gera tipos e hooks a partir do OpenAPI do Django Ninja; se a API mudar, o frontend acusa o erro na compilação |
| **Menos bugs de integração** | Campos errados ou ausentes aparecem no editor, antes de rodar |
| **Formulários seguros** | Zod valida no cliente com as mesmas regras dos schemas do backend |

```ts
// Tipo gerado a partir da API: o frontend nunca "adivinha" o formato
export interface Oportunidade {
  regra: string;
  status: "suficiente" | "limitada" | "bloqueada";
  titulo: string;
  evidencias: { fonte: "vendas" | "balcao" | "estoque"; descricao: string; meta?: string }[];
  limitacao: string;
}
```

## 4. Alternativas consideradas

| Alternativa | Por que não agora |
| --- | --- |
| **FastAPI puro** | Teríamos de montar autenticação, ORM, migrações e admin à parte; em 48 h o Django Ninja entrega o mesmo estilo com menos risco. FastAPI fica reservado caso a prática sorteada seja microsserviços |
| **Java (Spring/Quarkus)** | Mais verboso para o prazo e menos alinhado ao trabalho com dados e IA |
| **Node.js no backend** | Dividiria a equipe entre duas linguagens de servidor e perderia o ecossistema de dados do Python |
| **JavaScript sem tipos no frontend** | Mais rápido para começar, porém mais frágil na integração com a API |

## 5. Padrões de código

| Tema | Python | TypeScript |
| --- | --- | --- |
| Formatação e lint | **Ruff** (lint + format), linha de 100 colunas | **ESLint + Prettier** |
| Tipagem | Type hints em funções públicas e serviços | `strict: true` |
| Dinheiro | `Decimal`, nunca `float` | Valores chegam como string e são formatados com `Intl.NumberFormat("pt-BR")` |
| Datas | `datetime` com fuso (`USE_TZ=True`, `America/Araguaina`) | `date-fns` com locale `pt-BR` |
| Nomes | Domínio em português (`DemandaNaoAtendida`, `registrar_demanda`) | Componentes em inglês e PascalCase (`OpportunityCard`), textos em português |
| Testes | pytest + pytest-django + factory_boy | Vitest + Testing Library |
| Verificação automática | pre-commit + GitHub Actions | GitHub Actions (`lint` + `build`) |
