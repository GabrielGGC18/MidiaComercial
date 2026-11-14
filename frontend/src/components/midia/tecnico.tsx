// Parte técnica da página inicial (ref. visual: helenacrm.com), com a nossa identidade.
// Só fatos do código: rotas reais (config/api.py), contratos Pydantic (apps/importacao/schemas.py),
// versões das regras e os 7 tipos de evento (apps/notificacoes/eventos.py).
import { ArrowRight, Bell, Boxes, Check, ClipboardList, Lightbulb, Mic, Send, Upload } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { indice, Revelar } from "./destaques";

const SOBRE = "text-sm font-semibold text-neon-700 dark:text-neon-500 inline-flex items-center gap-2";
const PONTO = <span className="size-2 rounded-full bg-neon-600 dark:bg-neon-500" aria-hidden />;
const TITULO = "titulo-secao";

/* ───────────── 1. camadas explodidas ───────────── */

const CAMADAS = [
  { nome: "Sua equipe", nota: "painel, balcão no celular, plano de ação", cor: "bg-violeta-100 border-violeta-300", faixa: "bg-violeta-300" },
  { nome: "Agente de vendas", nota: "propõe contatos; uma pessoa aprova", cor: "bg-violeta-500 border-violeta-300", faixa: "bg-white/60" },
  { nome: "Inteligência", nota: "regras A, B e C versionadas, com evidência", cor: "bg-neon-500 border-neon-300", faixa: "bg-tinta-950/35" },
  { nome: "Importação", nota: "formato comum, prévia e anti-duplicação", cor: "bg-tinta-800 border-tinta-700", faixa: "bg-violeta-300/70" },
  { nome: "Seus dados", nota: "planilha do sistema da loja (PDV)", cor: "bg-tinta-950 border-violeta-500/60", faixa: "bg-tinta-700" },
];

export function CamadasProduto() {
  return (
    <div className="px-3 pt-3" data-capitulo="claro">
      <section aria-labelledby="camadas-titulo" className="painel-secao mx-auto grid w-full max-w-[1280px] items-center gap-10 overflow-hidden rounded-[28px] border border-border px-5 py-16 sm:px-10 lg:grid-cols-[1fr_1.1fr] lg:px-14">
        <div>
          <p className={SOBRE}>{PONTO} Como é feito</p>
          <h2 id="camadas-titulo" className={cn(TITULO, "mt-3")}>
            Cinco camadas.
            <br />
            <span className="text-violeta-600 dark:text-violeta-300">Uma decisão no fim.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Os dados da loja entram por baixo, passam por conferência e por regras auditáveis, e chegam à equipe como próximo passo. O agente só
            propõe: quem decide é uma pessoa.
          </p>
        </div>

        {/* pilha isométrica: as camadas se separam ao entrar na tela */}
        <Revelar modo="grupo" className="pilha relative mx-auto h-[420px] w-full max-w-[560px]">
          {CAMADAS.map((c, i) => (
            <div key={c.nome} style={{ ...indice(i), top: `${30 + i * 64}px` }} className="absolute left-0 right-0 flex items-center gap-4">
              <div className="pilha-camada relative h-[120px] w-[200px] shrink-0 sm:w-[240px]" style={{ zIndex: 10 - i }}>
                <div className={cn("absolute inset-0 rounded-2xl border-2 shadow-[0_18px_30px_-12px_rgb(11_16_32/0.55)]", c.cor)}>
                  <span className={cn("absolute left-4 top-4 h-2.5 w-16 rounded-full", c.faixa)} />
                  <span className={cn("absolute left-4 top-9 h-2.5 w-24 rounded-full opacity-60", c.faixa)} />
                  <span className={cn("absolute bottom-4 right-4 h-6 w-10 rounded-md opacity-70", c.faixa)} />
                </div>
              </div>
              <div className="min-w-0 border-l border-border pl-3">
                <p className="font-semibold leading-tight">{c.nome}</p>
                <p className="text-xs leading-5 text-muted-foreground">{c.nota}</p>
              </div>
            </div>
          ))}
        </Revelar>
      </section>
    </div>
  );
}

/* ───────────── 2. faixa de fatos ───────────── */

const FATOS = [
  { v: "3", r: "regras de análise, com versão" },
  { v: "7", r: "avisos automáticos para a equipe" },
  { v: "1", r: "base separada por loja" },
  { v: "0", r: "mensagens sem revisão humana" },
];

export function FaixaFatos() {
  return (
    <div className="px-3 pt-3">
      <Revelar modo="grupo" className="mx-auto grid w-full max-w-[1280px] grid-cols-2 gap-y-6 rounded-[28px] bg-tinta-950 px-6 py-8 text-white shadow-[0_24px_50px_-28px_rgb(11_16_32/0.8)] sm:px-10 lg:grid-cols-4">
        {FATOS.map((f, i) => (
          <div key={f.r} style={indice(i)} className="border-white/10 px-2 lg:border-l lg:first:border-0 lg:px-6">
            <p className="titulo-fino font-display text-5xl font-bold">
              <span data-conta={f.v}>{f.v}</span>
              <span className="text-neon-500">.</span>
            </p>
            <p className="mt-1 text-sm leading-5 text-tinta-300">{f.r}</p>
          </div>
        ))}
      </Revelar>
    </div>
  );
}

/* ───────────── 3. blocos com rota real ───────────── */

const BLOCOS = [
  { Icone: Mic, nome: "Balcão", texto: "Procura sem estoque por toque ou voz. Confirma antes de gravar.", rota: "POST /api/demandas/", destaque: "violeta" },
  { Icone: Upload, nome: "Importação", texto: "Planilha com prévia e conferência. Reenviar não duplica.", rota: "POST /api/importacoes/preview" },
  { Icone: Lightbulb, nome: "Oportunidades", texto: "Até 3 por semana, com motivo e próximo passo.", rota: "POST /api/oportunidades/gerar" },
  { Icone: ClipboardList, nome: "Plano de ação", texto: "Responsável, prazo e medida de antes e depois.", rota: "POST /api/acoes/{id}/medicoes" },
  { Icone: Send, nome: "Agente de vendas", texto: "Sugere clientes com autorização e escreve a mensagem. Uma pessoa confirma.", rota: "POST /api/agente/propostas/{id}/confirmar", destaque: "neon" },
  { Icone: Bell, nome: "Notificações", texto: "Aviso repetido vira contador, não spam.", rota: "GET /api/notificacoes/contagem" },
];

export function BlocosProduto() {
  return (
    <div className="px-3 pt-3" data-capitulo="claro">
      <section id="plataforma" aria-labelledby="blocos-titulo" className="painel-secao scroll-mt-24 mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-border px-5 py-16 sm:px-10 lg:px-14">
        <p className={SOBRE}>{PONTO} A plataforma</p>
        <h2 id="blocos-titulo" className={cn(TITULO, "mt-3 max-w-2xl")}>
          Seis partes, <span className="text-violeta-600 dark:text-violeta-300">uma plataforma</span>
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">Cada parte tem rota própria, com permissão por papel e por loja.</p>
        <Revelar modo="grupo" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BLOCOS.map((b, i) => (
            <article
              key={b.nome}
              style={indice(i)}
              className={cn(
                "flex flex-col rounded-2xl border p-6 transition-transform duration-300 hover:-translate-y-1",
                b.destaque === "violeta" && "border-violeta-500 bg-violeta-500 text-white",
                b.destaque === "neon" && "border-neon-500 bg-neon-500 text-tinta-950",
                !b.destaque && "border-border bg-card",
              )}
            >
              <span className={cn("grid size-10 place-items-center rounded-xl", b.destaque === "neon" ? "bg-tinta-950/10" : b.destaque ? "bg-white/20" : "bg-violeta-50 text-violeta-700 dark:bg-violeta-900/50 dark:text-violeta-100")}>
                <b.Icone className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{b.nome}</h3>
              <p className={cn("mt-1 flex-1 text-sm leading-6", b.destaque === "neon" ? "text-tinta-950/80" : b.destaque ? "text-white/85" : "text-muted-foreground")}>{b.texto}</p>
              <code className={cn("mt-5 self-start rounded-md px-2 py-1 font-mono text-[11px]", b.destaque === "neon" ? "bg-tinta-950/10" : b.destaque ? "bg-black/20" : "bg-muted text-muted-foreground")}>{b.rota}</code>
            </article>
          ))}
        </Revelar>
      </section>
    </div>
  );
}

/* ───────────── 4. feito para ser auditado ───────────── */

const ITENS = [
  { t: "Contrato de importação", d: "Linha inválida vira erro com o número da linha.", tag: "schemas.py" },
  { t: "Regras versionadas", d: "Cada cartão guarda regra, versão e evidência.", tag: "A 1.1 · B 1.1 · C 1.0" },
  { t: "Isolamento por loja", d: "Toda consulta usa a loja da sessão.", tag: "gerente · atendente" },
  { t: "Eventos após gravar", d: "O aviso só sai depois de o banco confirmar.", tag: "on_commit" },
  { t: "Saúde do serviço", d: "Rota pública para monitorar o serviço.", tag: "GET /api/saude" },
];

const CODIGO = {
  csv: {
    rotulo: "Formato comum (CSV)",
    texto: `pedido_id,item_id,data_hora,sku,categoria,quantidade,receita_item,status,cliente_ref
P-1042,1,2026-11-14T16:20:00-03:00,BON-PRE-U,Bonés,1,89.90,concluida,CL-017
P-1043,1,2026-11-14T16:41:00-03:00,CJE-AZ-42,Calças,1,189.90,concluida,`,
  },
  curl: {
    rotulo: "Prévia (curl)",
    texto: `curl -X POST https://<sua-loja>/api/importacoes/preview \\
  -H "X-CSRFToken: <token>" -b "sessionid=<sessão>" \\
  -F tipo=vendas \\
  -F arquivo=@vendas-14-11.csv
# → lote em prévia: linhas ok, rejeitadas (com motivo) e duplicadas.
#   Nada é gravado até POST /api/importacoes/{lote_id}/confirmar`,
  },
  json: {
    rotulo: "Oportunidade (JSON)",
    texto: `{
  "regra": "A_LACUNA_MIX", "versao_regra": "1.1",
  "status": "suficiente",
  "titulo": "Investigar reposição: Calça jeans Azul 42",
  "acao_sugerida": "Conferir estoque físico e consultar fornecedor.",
  "limitacao": "São 6 atendimentos, não 6 compradores únicos.",
  "evidencias": [
    { "fonte": "demanda", "descricao": "6 procuraram e não tinha", "amostra": 6 },
    { "fonte": "estoque", "descricao": "Saldo informado: 0", "amostra": 1 }
  ]
}`,
  },
} as const;

const EVENTOS = [
  ["demanda_limiar", "produto chegou a N procuras sem estoque"],
  ["oportunidade_nova", "cartão novo com dados suficientes"],
  ["campanha_proposta", "agente propôs contatos"],
  ["cliente_comprou", "cliente contatado comprou em 14 dias"],
  ["acao_atrasada", "plano passou do prazo"],
  ["importacao_divergente", "total do arquivo não bate com o informado"],
  ["estoque_desatualizado", "estoque velho bloqueia a regra B"],
] as const;

export function FeitoParaAuditar() {
  const [aba, setAba] = useState<keyof typeof CODIGO>("csv");
  return (
    <div className="px-3 pt-3" data-capitulo="noite">
      <section aria-labelledby="auditar-titulo" className="mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-white/10 bg-tinta-950 px-5 py-16 text-white sm:px-10 lg:px-14">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-neon-500">{PONTO} Para quem confere</p>
        <h2 id="auditar-titulo" className={cn(TITULO, "mt-3")}>
          Feito para ser <span className="text-violeta-300">auditado</span>
        </h2>
        <p className="mt-3 max-w-2xl text-tinta-300">Cada número tem origem, versão e registro.</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <Revelar modo="grupo" as="ul" className="flex flex-col">
            {ITENS.map((it, i) => (
              <li key={it.t} style={indice(i)} className="flex items-start justify-between gap-4 border-b border-white/10 py-4 first:pt-0">
                <div>
                  <p className="font-semibold">{it.t}</p>
                  <p className="mt-0.5 text-sm text-tinta-300">{it.d}</p>
                </div>
                <code className="shrink-0 font-mono text-[11px] text-sinal-ok">{it.tag}</code>
              </li>
            ))}
          </Revelar>

          <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0e1430]">
            <div role="tablist" aria-label="Exemplos" className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 pt-2">
              {(Object.keys(CODIGO) as (keyof typeof CODIGO)[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={aba === k}
                  onClick={() => setAba(k)}
                  className={cn(
                    "whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-colors",
                    aba === k ? "bg-white/10 text-white" : "text-tinta-300 hover:text-white",
                  )}
                >
                  {CODIGO[k].rotulo}
                </button>
              ))}
            </div>
            <pre className="min-h-[260px] flex-1 overflow-x-auto p-5 font-mono text-[12.5px] leading-6 text-tinta-100">
              <code>{CODIGO[aba].texto}</code>
            </pre>
            <p className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-tinta-300">
              <span>Exemplos com dados fictícios</span>
              <span className="inline-flex items-center gap-1 text-violeta-300">
                <Check className="size-3.5" aria-hidden /> Validado pelo contrato
              </span>
            </p>
          </div>
        </div>

        <h3 className="mt-12 text-lg font-semibold">
          Eventos que avisam a equipe <span className="ml-2 text-sm font-normal text-tinta-300">só depois de gravar</span>
        </h3>
        <Revelar modo="grupo" as="ul" className="mt-4 flex flex-wrap gap-2">
          {EVENTOS.map(([k, d], i) => (
            <li key={k} style={indice(i)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs">
              <code className="font-mono font-semibold text-white">{k}</code>
              <span className="text-tinta-300">{d}</span>
            </li>
          ))}
        </Revelar>
      </section>
    </div>
  );
}

/* ───────────── 5. fluxo em 3 colunas ───────────── */

export function FluxoTresColunas() {
  const colunas = [
    { quem: "Seu sistema", titulo: "Registra a venda", itens: ["PDV ou planilha", "Vendas, estoque e clientes", "Nada muda no caixa"], Icone: Boxes, estilo: "border-border bg-card" },
    {
      quem: "MidiaComercial",
      titulo: "Confere e cruza",
      itens: ["Prévia e anti-duplicação", "Balcão: o que faltou", "Até 3 decisões com evidência"],
      Icone: Lightbulb,
      estilo: "border-violeta-500 bg-violeta-500 text-white",
    },
    { quem: "Sua equipe", titulo: "Decide e age", itens: ["Cria a ação com prazo", "Aprova cada mensagem", "Vê o resultado medido"], Icone: Check, estilo: "border-border bg-card" },
  ];
  return (
    <div className="px-3 pt-3" data-capitulo="claro">
      <section aria-labelledby="fluxo-titulo" className="painel-secao mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-border px-5 py-16 sm:px-10 lg:px-14">
        <p className={SOBRE}>{PONTO} O modelo</p>
        <h2 id="fluxo-titulo" className={cn(TITULO, "mt-3 max-w-2xl")}>
          O caixa continua o mesmo. <span className="text-violeta-600 dark:text-violeta-300">A decisão fica melhor.</span>
        </h2>
        <Revelar modo="grupo" className="mt-10 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {colunas.map((c, i) => (
            <div key={c.quem} className="contents">
              <article style={indice(i * 2)} className={cn("rounded-2xl border p-6", c.estilo)}>
                <p className="text-sm opacity-75">{c.quem}</p>
                <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold">
                  <c.Icone className="size-5" aria-hidden /> {c.titulo}
                </h3>
                <ul className="mt-5 flex flex-col gap-2 text-sm">
                  {c.itens.map((t) => (
                    <li key={t} className="flex items-center gap-2 border-t border-current/10 pt-2">
                      <span className="opacity-50">—</span> {t}
                    </li>
                  ))}
                </ul>
              </article>
              {i < colunas.length - 1 && (
                <span style={indice(i * 2 + 1)} className="hidden items-center justify-center text-violeta-500 lg:flex" aria-hidden>
                  <ArrowRight className="size-6" />
                </span>
              )}
            </div>
          ))}
        </Revelar>
      </section>
    </div>
  );
}
