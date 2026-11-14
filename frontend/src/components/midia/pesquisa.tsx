// Seção "O que ouvimos no shopping": a pesquisa da equipe com lojistas e os sistemas que eles usam,
// ao lado da pilha de cards (ReactBits CardSwap) com o caminho fala → registro → decisão.
// Base: docs/10 e docs/16. A pesquisa é qualitativa (relatos das visitas), por isso não há percentuais aqui.
// SETA e UNIX aparecem como sistemas citados pelos lojistas: o MidiaComercial fica ao lado deles e lê o que
// exportam em planilha; conexão direta só depois de validada (PV-12).
import { Building2, Store } from "lucide-react";
import { indice, Revelar } from "./destaques";
import { PainelHero } from "./vitrine";

const DIFICULDADES = [
  { n: "01", titulo: "Preencher dados", texto: "No balcão cheio, ninguém para para digitar o que o cliente pediu." },
  { n: "02", titulo: "Fazer pós-venda", texto: "A venda fica no caixa, mas não vira um retorno ao cliente." },
  { n: "03", titulo: "Manter contato", texto: "Saber quem chamar, com qual produto e quando." },
];

const SISTEMAS = [
  { icone: Building2, nome: "SETA", quem: "Franquias", texto: "Sistema de gestão usado nas lojas de rede. Ferramentas parecidas já existem nesse mundo." },
  { icone: Store, nome: "UNIX", quem: "Lojas pequenas", texto: "Sistema do caixa da loja independente. Registra a venda, mas não a procura nem o pós-venda." },
];

/* ───────────── seção ───────────── */

export function PesquisaSecao() {
  return (
    <div className="px-3 pt-3" data-capitulo="violeta">
      <section
        id="pesquisa"
        aria-labelledby="pesquisa-titulo"
        className="relative mx-auto w-full max-w-[1280px] scroll-mt-24 overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1020] bg-[radial-gradient(70%_60%_at_0%_0%,rgb(109_74_255/0.22),transparent_60%)] px-5 py-14 text-white sm:px-10 lg:px-14 lg:py-20"
      >
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
          <Revelar modo="grupo" className="min-w-0">
            <p style={indice(0)} className="text-xs font-semibold uppercase tracking-[0.14em] text-neon-500">
              Pesquisa de campo
            </p>
            <h2 id="pesquisa-titulo" style={indice(1)} className="titulo-secao mt-2">
              Fomos ao shopping
              <br />
              ouvir quem vende.
            </h2>
            <p style={indice(2)} className="mt-4 max-w-[56ch] text-base leading-7 text-tinta-300">
              Visitamos lojistas do shopping, de franquias e de lojas independentes, e pesquisamos os sistemas que eles usam no dia a dia. As
              franquias já têm ferramentas parecidas. As lojas menores contaram três dificuldades:
            </p>

            <ol style={indice(3)} className="mt-6 grid gap-3 sm:grid-cols-3">
              {DIFICULDADES.map((d) => (
                <li key={d.n} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <span className="font-display text-3xl font-extrabold text-neon-500">{d.n}</span>
                  <p className="mt-1 font-semibold">{d.titulo}</p>
                  <p className="mt-1 text-sm leading-5 text-tinta-300">{d.texto}</p>
                </li>
              ))}
            </ol>

            <p style={indice(4)} className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-violeta-300">
              Os sistemas que encontramos
            </p>
            <div style={indice(4)} className="mt-3 grid gap-3 sm:grid-cols-2">
              {SISTEMAS.map((s) => (
                <article key={s.nome} className="min-w-0 rounded-2xl border border-white/10 bg-[#141c34] p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violeta-500/20 text-violeta-300">
                      <s.icone className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-xl font-bold leading-none">{s.nome}</p>
                      <p className="mt-1 text-xs text-tinta-300">{s.quem}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-5 text-tinta-200">{s.texto}</p>
                </article>
              ))}
            </div>

            {/* a camada: fica ao lado do sistema da loja */}
            <div style={indice(5)} className="mt-6 rounded-2xl border border-neon-500/40 bg-neon-500/[0.07] p-4 sm:p-5">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <span className="rounded-lg bg-white/10 px-2.5 py-1">SETA ou UNIX</span>
                <span className="text-neon-500" aria-hidden>
                  →
                </span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1">planilha exportada</span>
                <span className="text-neon-500" aria-hidden>
                  →
                </span>
                <span className="rounded-lg bg-neon-500 px-2.5 py-1 text-tinta-950">MidiaComercial</span>
              </p>
              <p className="mt-3 text-sm leading-6 text-tinta-200">
                Por isso o MidiaComercial é uma <b className="text-white">camada que se integra à rotina</b>, não um sistema novo: a loja continua no
                caixa que já usa e nós lemos o que ele exporta. A conexão direta com cada sistema entra depois de testada com a loja.
              </p>
            </div>
          </Revelar>

          <div className="min-w-0">
            <PainelHero />
          </div>
        </div>
      </section>
    </div>
  );
}
