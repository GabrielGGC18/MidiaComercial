# 04. Arquitetura proposta

**Projeto:** MidiaComercial
**Data:** 13/11/2026

---

## 1. Visão geral

**Estilo:** monólito modular em Django (backend + API) com uma SPA React (frontend), servidos no mesmo domínio.

- **Monólito modular:** um único projeto Django dividido em apps por domínio. Fácil de construir e implantar em 48 h, sem a complexidade de microsserviços.
- **Camadas:** a interface e a API são finas; a regra de negócio fica na camada de serviços; o motor de regras é código puro e testável.
- **Mesmo domínio para SPA e API:** sem CORS; autenticação por sessão com proteção CSRF.

```mermaid
flowchart TB
    subgraph Cliente
        U1["Navegador<br/>(dono / gerente)"]
        U2["Celular<br/>(atendente)"]
    end

    subgraph VPS["Hostinger VPS (Docker Compose)"]
        C["Caddy<br/>HTTPS + SPA React"]
        subgraph Django["Django + Gunicorn"]
            API["API JSON<br/>Django Ninja /api"]
            MW["Middleware<br/>sessão → loja atual"]
            S["Serviços de domínio"]
            subgraph INT["Camada de inteligência"]
                Q["Qualidade dos dados"]
                M["Métricas"]
                R["Regras A / B / C"]
                P["Priorização (máx. 3)"]
                E["Explicação<br/>(template / IA)"]
            end
            AG["Agente de preenchimento<br/>(propõe, não grava)"]
        end
        DB[("PostgreSQL 16")]
    end

    LLM["Provedor de LLM<br/>(opcional)"]

    U1 & U2 -->|"HTTPS"| C
    C -->|"/ (arquivos do React)"| U1
    C -->|"/api, /admin"| API
    API --> MW --> S
    S --> INT
    S --> DB
    INT --> DB
    API --> AG
    AG --> S
    E -.->|"só agregados"| LLM
    AG -.->|"texto sem dados pessoais"| LLM
```

## 2. Componentes

| Componente | Responsabilidade |
| --- | --- |
| **SPA React** | Telas, formulários, gráficos e o painel do agente; consome apenas a API |
| **Caddy** | HTTPS automático, entrega os arquivos do React e encaminha `/api` e `/admin` para o Django |
| **API (Django Ninja)** | Rotas JSON tipadas, validação com Pydantic, documentação OpenAPI em `/api/docs` |
| **Middleware de loja** | Define `request.loja` e `request.papel` a partir da sessão e do vínculo do usuário |
| **Serviços** | Regras de negócio (importar, registrar demanda, criar ação, confirmar proposta) |
| **Camada de inteligência** | Qualidade → métricas → regras → priorização → explicação |
| **Agente de preenchimento** | Transforma texto ou planilhas em propostas que a pessoa confirma |
| **PostgreSQL** | Dados normalizados por loja, com constraints de unicidade e auditoria |

## 3. Apps Django (módulos)

| App | Responsabilidade | Entidades |
| --- | --- | --- |
| `core` | Middleware de loja, consultas com escopo de loja, utilidades | — |
| `contas` | Lojas, usuários, vínculos, papéis, limiares das regras | `Loja`, `Vinculo`, `ConfiguracaoLoja` |
| `importacao` | Upload, prévia, validação, confirmação, reconciliação | `LoteImportacao`, `LinhaRejeitada` |
| `comercio` | Catálogo e histórico de vendas | `Produto`, `Variante`, `Pedido`, `ItemPedido`, `Devolucao` |
| `estoque` | Saldo por variante e momento | `SnapshotEstoque` |
| `publico` | Demanda declarada no balcão | `DemandaNaoAtendida` |
| `inteligencia` | Métricas, regras, oportunidades e evidências | `ExecucaoMotor`, `Oportunidade`, `Evidencia` |
| `acoes` | Plano de ação, medição e auditoria | `PlanoAcao`, `Medicao`, `EventoAuditoria` |
| `agente` | Agente de IA para preenchimento de dados | `SessaoAgente`, `PropostaAgente`, `ChamadaFerramenta` |

### Regra de dependência

```
React  →  API (Ninja)  →  serviços  →  inteligência / modelos  →  PostgreSQL
                              ↑
              nunca o contrário: regras não conhecem request nem HTTP
```

## 4. Fluxo de dados ponta a ponta

```mermaid
flowchart LR
    A["CSV de vendas"] --> B["Prévia + validação"]
    B -->|"confirmar"| C["Lote importado<br/>(transação)"]
    D["Balcão<br/>(formulário ou agente)"] --> F
    C --> F["Dados normalizados<br/>por loja"]
    G["CSV de estoque"] --> F
    F --> H["Métricas"]
    H --> I["Regras + checagem<br/>de qualidade"]
    I --> J["Até 3 oportunidades<br/>com evidências"]
    J --> K["Plano de ação"]
    K --> L["Medição"]
    L --> F
```

## 5. Camada de inteligência

| Etapa | O que faz |
| --- | --- |
| 1. Contexto | Carrega a janela de análise (ex.: 30 dias) da loja autenticada |
| 2. Qualidade | Mede cobertura de cliente identificado, idade do estoque, reconciliação |
| 3. Métricas | Participação por categoria, ticket médio, vendas por dia/hora, demanda por variante |
| 4. Regras | Cada regra declara os dados de que precisa; se faltarem, fica **bloqueada** com motivo |
| 5. Priorização | Ordem transparente: lacuna de mix > estoque parado > padrão de público; corta em 3 |
| 6. Explicação | Texto por template (sempre); IA opcional reescreve, validada contra os números |
| 7. Persistência | Grava oportunidade, evidências, versão da regra e execução |

```python
class Regra(Protocol):
    codigo: str  # "A_LACUNA_MIX"
    versao: str  # "1.0"
    campos_necessarios: set[str]  # {"demanda", "estoque_atualizado"}

    def avaliar(self, ctx: ContextoAnalise) -> ResultadoRegra: ...
```

## 6. Agente de preenchimento (IA)

```mermaid
sequenceDiagram
    actor A as Atendente
    participant UI as React (painel)
    participant API as API /agente
    participant O as Orquestrador
    participant L as LLM (ou modo offline)
    participant S as Serviços

    A->>UI: "procurou camiseta azul M e não tinha"
    UI->>API: POST /mensagens
    API->>O: texto com dados pessoais mascarados
    O->>L: ferramentas permitidas para o papel
    L-->>O: buscar_variante("camiseta azul", "M")
    O->>S: busca no catálogo da loja
    L-->>O: propor_demanda(variante, motivo)
    O-->>UI: proposta pendente
    A->>UI: Confirmar
    UI->>API: POST /propostas/{id}/confirmar
    API->>S: registrar_demanda (mesmas validações do formulário)
```

**Garantias:** propõe e não grava; usa as mesmas validações do sistema; age só na loja da sessão; ferramentas por papel; limite de passos; tudo auditado; funciona offline com um provedor determinístico.

## 7. Modelo de dados

```mermaid
erDiagram
    LOJA ||--o{ VINCULO : tem
    USER ||--o{ VINCULO : tem
    LOJA ||--|| CONFIGURACAO_LOJA : define
    LOJA ||--o{ PRODUTO : cadastra
    PRODUTO ||--o{ VARIANTE : possui
    LOJA ||--o{ PEDIDO : registra
    PEDIDO ||--o{ ITEM_PEDIDO : contem
    VARIANTE ||--o{ ITEM_PEDIDO : vendida_em
    ITEM_PEDIDO ||--o{ DEVOLUCAO : pode_ter
    VARIANTE ||--o{ SNAPSHOT_ESTOQUE : saldo
    LOJA ||--o{ DEMANDA_NAO_ATENDIDA : registra
    LOJA ||--o{ LOTE_IMPORTACAO : recebe
    LOTE_IMPORTACAO ||--o{ LINHA_REJEITADA : gera
    LOJA ||--o{ OPORTUNIDADE : recebe
    OPORTUNIDADE ||--o{ EVIDENCIA : sustentada_por
    OPORTUNIDADE ||--o| PLANO_ACAO : gera
    PLANO_ACAO ||--o{ MEDICAO : acompanha
    LOJA ||--o{ PROPOSTA_AGENTE : recebe
```

**Regras de integridade:**
- Toda entidade operacional tem `loja`; a loja vem da sessão, nunca do arquivo ou do parâmetro.
- Unicidade garante importação idempotente: pedido por (loja, origem, id), item por (pedido, item), SKU por loja.
- Dinheiro em `DecimalField`; datas com fuso.
- Registros filhos herdam a loja do pai e recusam vínculos com outra loja.

## 8. Segurança

| Camada | Controle |
| --- | --- |
| Transporte | HTTPS (Caddy), HSTS, cabeçalhos de segurança |
| Autenticação | Sessão Django com cookie `HttpOnly`, CSRF obrigatório em escrita |
| Autorização | Papel por vínculo; consultas sempre filtradas pela loja; ID de outra loja → 404 |
| Dados pessoais | Demo sintética; sem CPF/nome/telefone; mascaramento antes de qualquer IA |
| Auditoria | Importações, ações, propostas e chamadas do agente registradas |
| Segredos | `.env` fora do Git; chaves diferentes por ambiente |

## 9. Implantação

```mermaid
flowchart LR
    DEV["Desenvolvedor"] -->|"git push"| GH["GitHub"]
    GH -->|"Actions: lint + testes + build"| CI["CI"]
    GH -.->|"git pull + docker compose up"| VPS
    subgraph VPS["Hostinger VPS: Ubuntu + Docker Compose"]
        CA["caddy<br/>(SPA + HTTPS)"] --> WEB["web<br/>(Django + Gunicorn)"]
        WEB --> PG[("db<br/>PostgreSQL 16")]
    end
    U["Usuário"] -->|"HTTPS"| CA
```

**Plano B:** a demo roda localmente com `docker compose up` e o seed, sem internet e sem IA.

## 10. Decisões de arquitetura (resumo)

| # | Decisão | Motivo |
| --- | --- | --- |
| D1 | Monólito modular em vez de microsserviços | Menos infraestrutura e risco em 48 h |
| D2 | Django Ninja em vez de FastAPI separado | Estilo FastAPI sem duplicar autenticação, ORM e deploy |
| D3 | SPA React no mesmo domínio da API | Sem CORS; sessão e CSRF funcionam direto |
| D4 | Regras determinísticas antes de IA | Números reproduzíveis e explicáveis |
| D5 | IA só explica e propõe; nunca decide nem grava | Confiança e segurança |
| D6 | Status descritivo em vez de "% de confiança" | Evitar falsa precisão |
| D7 | Dados sintéticos na demo | LGPD e reprodutibilidade |
