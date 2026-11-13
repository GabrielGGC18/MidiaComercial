# P3-04 · Chat do agente no padrão do Midia63 (ATOM)

**Dono:** Pessoa 3 · **Prioridade:** P1 · **Estimativa:** 1,5 dia · **Depende de:** P2-01 (API de conversas), P3-01 (largura "leitura") · **Agente de apoio:** `.claude/agents/chat-ui.md`

## Referência

O chat do ATOM no Midia63, rota `/core/sistema/agentes/atom/`. O código está no repositório do Midia63 (peça acesso ao Gabriel e clone ao lado deste):

| Arquivo | O que tem |
| --- | --- |
| `sistema/templates/sistema/chat.html` | Estrutura: topo, palco, mensagens, envio, menu e painel de foco |
| `sistema/static/sistema/chat.css` | Coluna de 760 px, mensagem do agente sem balão, balão do usuário à direita, passos, barra "/" e responsivo |
| `sistema/static/sistema/chat.js` | Comportamento: Enter/Shift+Enter, altura automática, rascunho, barra de funções, copiar, recolher texto longo e "parar" |

**Leia os três antes de começar.** Não é para copiar o HTML nem o JS: é Django + JS puro. Aqui reescrevemos em React, com os tokens e a geometria do Mídia UI.

## O que temos hoje (o que vai mudar)

`frontend/src/features/agente/AgenteChat.tsx`:

- **Bolhas** com `border-l-2` dos dois lados; a mensagem do agente fica num balão cinza.
- **Campo de texto** de uma linha (`<input>`): frase longa não cabe e não dá para quebrar linha.
- Sem histórico de conversas, sem "nova conversa", sem passos do agente, sem copiar e sem "parar".
- A conversa some ao fechar a gaveta (a memória fica só no estado do React).

## Anatomia: do Midia63 para o MidiaComercial

| Midia63 (classe) | O que é | Aqui (componente) |
| --- | --- | --- |
| `.chat__topo` | Voltar, avatar, nome, papel, **estado** ("Disponível" com ponto verde, "Trabalhando" com ponto pulsando), "Nova conversa" e menu ⋮ | `ChatTopo` |
| `.chat__menu` (`<details>`) | Menu ⋮: histórico de conversas e "Limpar conversa" | `ChatMenu` (use Radix `DropdownMenu` ou `Popover`, não `<details>`) |
| `.chat__area` + `.chat__area--foco` | Grade: palco + **painel de foco de 300 px** em telas ≥ 1100 px | `ChatAgente` (layout) + `PainelFoco` |
| `.chat__palco` | Coluna que ocupa a altura; mensagens rolam, envio fica embaixo | div `flex flex-col` com altura `calc(100dvh - ...)` |
| `.msg` (`--coluna: 760px`) | Mensagem centralizada numa coluna de leitura | `MensagemChat` |
| `.msg--agente` | **Sem balão**: texto corrido, como documento | `MensagemChat papel="agente"` |
| `.msg--usuario` | Balão à direita, `max-width: min(620px, 86%)` (92% no celular) | `MensagemChat papel="voce"` |
| `.msg__ferramentas` | Embaixo da mensagem: **copiar** e hora | `AcoesMensagem` |
| `details.passos` | "Passos" recolhíveis: o que o agente fez (✓ feito, ⚠ recusado) | `PassosAgente` |
| `.acao-card` | Cartão de ação para aprovar | **Já temos:** `PropostaCard` (`components/midia/agente.tsx`) |
| `.chat__sugestoes` | Atalhos antes da 1ª mensagem; somem depois (`[data-conversa]`) | `Sugestoes` |
| `.chat__barra` | **Barra "/"**: digitar "/" abre a lista de funções do agente, navegável por setas | `BarraFuncoes` |
| `.chat__linha` | Caixa de envio: textarea com altura automática, anexar, **parar**, enviar | `CaixaEnvio` (no lugar de anexar, o nosso **microfone**) |
| `.chat__dica` | "Enter envia · Shift+Enter quebra a linha · / abre as funções" | linha `text-xs` embaixo da caixa |
| `.msg--digitando` | "Agente está respondendo…" | reaproveite `Processando` de `destaques.tsx` |

### Adaptações obrigatórias ao Mídia UI

| Midia63 | Aqui |
| --- | --- |
| `border-radius: 18px`, `13px` e `12px` | `rounded-md` (geometria reta, docs/08). `rounded-full` só no microfone e no ponto de estado |
| Cores hex (`#22c55e`, `#a8c4ff` etc.) | Tokens: `sinal-ok`, `violeta-*`, `tinta-*`, `muted-foreground` |
| `--agente: cor do agente` | Violeta (`violeta-500`) |
| Font Awesome | `lucide-react` |
| Polling a cada N segundos para o estado | Não precisa: a resposta vem na própria requisição do `POST /mensagens` |

## Onde mexer (estrutura nova)

```
frontend/src/components/midia/chat.tsx        ← só apresentação, SEM fetch (regra do projeto):
                                                MensagemChat, PassosAgente, AcoesMensagem, Sugestoes, EstadoAgente
frontend/src/features/agente/chat/
  ChatAgente.tsx      ← orquestra: conversa atual, envio, TanStack Query (fetch fica aqui)
  CaixaEnvio.tsx      ← textarea + voz + parar + enviar + dica
  BarraFuncoes.tsx    ← lista "/" (role=listbox)
  ChatMenu.tsx        ← ⋮ histórico, nova, limpar
  PainelFoco.tsx      ← propostas pendentes da conversa (≥1100 px)
  useRascunho.ts      ← rascunho por conversa em sessionStorage
frontend/src/features/agente/AgenteChat.tsx    ← vira um wrapper fino: <ChatAgente modo="gaveta" />
frontend/src/features/agente/AgentePage.tsx    ← a aba de conversa usa <ChatAgente modo="pagina" />
```

`modo="gaveta"` (dentro do Dialog) não tem painel de foco nem botão voltar. `modo="pagina"` tem tudo.

## Passo a passo

### 1. Dados (TanStack Query, sempre com a loja na chave)

```ts
const chave = useChaveLoja("agente", "conversas");
const conversas = useQuery({ queryKey: chave, queryFn: () => api<ConversaResumo[]>("/api/agente/conversas") });
const [sessaoId, setSessaoId] = useState<number | null>(null);
const conversa = useQuery({
  queryKey: useChaveLoja("agente", "conversa", sessaoId),
  queryFn: () => api<Conversa>(`/api/agente/conversas/${sessaoId}`),
  enabled: sessaoId != null,
});
```

- **Enviar:**
  - `POST /api/agente/mensagens` com `{ texto, canal, sessao_id }`.
  - Use **atualização otimista**: a fala do usuário aparece na hora; a do agente entra quando a resposta chega.
  - No sucesso, guarde o `sessao_id` e invalide `["agente","conversas"]` para o histórico atualizar.
- **Nova conversa:** `setSessaoId(null)` e limpar a lista local. Não chama a API.
- **Abrir do histórico:** `setSessaoId(id)`. A transcrição vem do `GET /conversas/{id}` (P2-01).
- **Limpar conversa:**
  - `DELETE /conversas/{id}`, com confirmação num `Dialog` do projeto.
  - **Nunca** `window.confirm`, porque trava a automação e foge do visual.

### 2. Layout (palco e coluna de leitura)

```tsx
<div className={cn("grid gap-3", comFoco && "min-[1100px]:grid-cols-[minmax(0,1fr)_300px]")}>
  <section className="flex h-[clamp(520px,calc(100dvh-190px),900px)] min-w-0 flex-col">
    <div role="log" aria-live="polite" aria-label="Conversa com o agente"
         className="min-h-0 flex-1 overflow-y-auto px-1 pb-4 pt-2">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">{/* mensagens */}</div>
    </div>
    <CaixaEnvio className="mx-auto w-full max-w-[760px]" ... />
  </section>
  {comFoco && <PainelFoco className="hidden min-[1100px]:block" ... />}
</div>
```

- `role="log"`: o leitor de tela anuncia só o que **entrou**, não a lista toda.
- **Na gaveta,** a altura é `flex-1 min-h-0` (o Dialog define o tamanho), e não o `clamp`.

### 3. Mensagens

```tsx
export function MensagemChat({ papel, texto, hora, children }: Props) {
  if (papel === "voce")
    return (
      <article className="ml-auto flex max-w-[min(620px,86%)] flex-col items-end gap-1 max-sm:max-w-[92%]">
        <p className="whitespace-pre-wrap rounded-md bg-violeta-500 px-4 py-2.5 text-[15px] leading-relaxed text-white">{texto}</p>
        <AcoesMensagem texto={texto} hora={hora} />
      </article>
    );
  return (
    <article className="flex flex-col gap-2 text-[15.5px] leading-[1.65]">
      <p className="whitespace-pre-wrap">{texto}</p>
      {children /* PassosAgente, PropostaCard(s) */}
      <AcoesMensagem texto={texto} hora={hora} />
    </article>
  );
}
```

- **Texto longo do usuário** (mais de 6 linhas): recolha com `line-clamp-6` e um botão "Ver tudo" / "Recolher". Veja `recolherLongas()` no `chat.js`.
- **Copiar:**
  ```ts
  await navigator.clipboard.writeText(texto);
  ```
  O ícone vira ✓ por 2 s (`aria-label` muda para "Copiado"). Sem `navigator.clipboard` (http sem TLS), esconda o botão.
- **Hora:** `<time dateTime={iso}>` com `format(d, "HH:mm")` (date-fns).

### 4. Passos do agente

Os passos vêm da API (P2-01), já com rótulo de loja.

```tsx
export function PassosAgente({ passos }: { passos: string[] }) {
  if (!passos.length) return null;
  return (
    <details className="group text-[13px] text-muted-foreground">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 py-1 [&::-webkit-details-marker]:hidden">
        {passos.length} {passos.length === 1 ? "passo" : "passos"}
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
      </summary>
      <ol className="mt-1.5 grid gap-1 border-l border-border pl-3">
        {passos.map((p, i) => (
          <li key={i} className="flex items-baseline gap-2"><Check className="size-3 text-sinal-ok" aria-hidden />{p}</li>
        ))}
      </ol>
    </details>
  );
}
```

Aqui pode usar `<details>`, porque é conteúdo, não menu.

### 5. Caixa de envio

| Comportamento | Como |
| --- | --- |
| Altura automática | `textarea rows={1}`. No `onInput`: `el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"` |
| Enter | **No computador:** Enter envia e Shift+Enter quebra a linha. **No celular,** Enter **quebra a linha** (o teclado não tem Shift à mão; veja o comentário na linha 305 do `chat.js`). Detecte com `matchMedia("(pointer: coarse)").matches` |
| IME | Ignore Enter com `e.nativeEvent.isComposing` |
| Parar | Durante o envio, o botão "Enviar" vira "Parar" (■). Ele cancela a requisição com `AbortController`: o `api()` repassa `init`, então passe `signal`. A fala do usuário fica, com o aviso "Interrompido" |
| Voz | `VozButton` à esquerda (no Midia63, ali fica o anexo). A transcrição parcial aparece no textarea. O `canal` vai como `"voz"` |
| Rascunho | `useRascunho(sessaoId)`: salva no `sessionStorage` a cada digitação, com chave `mc-rascunho:{lojaId}:{sessaoId ?? "nova"}`. Use **sessionStorage**, nunca localStorage: o texto pode ter dado de cliente e precisa sumir ao fechar a aba. **Apague tudo no Sair** (combine com a P1-08) |
| Dica | `Enter envia · Shift + Enter quebra a linha · / abre as funções`. No celular: `/ abre as funções` |
| Foco | Ao abrir, foco no textarea (só no desktop: no celular, abriria o teclado sem querer) |

### 6. Barra "/" (funções)

- Ao digitar `/` no início do campo, abre uma lista com as ferramentas de `GET /api/agente/ferramentas`, já filtradas pelo papel no backend.
- Cada item mostra um **rótulo** e uma **frase de exemplo**:
  ```ts
  const ATALHOS: Record<string, { rotulo: string; exemplo: string }> = {
    propor_demanda: { rotulo: "Registrar procura", exemplo: "procurou calça jeans 42, não tinha" },
    propor_cliente: { rotulo: "Cadastrar cliente", exemplo: "cadastrar cliente Ana Souza, veste M, autoriza mensagem" },
    prospectar_produtos_em_baixa: { rotulo: "Vender produto parado", exemplo: "quero vender a camisa parada" },
    resumo_publico: { rotulo: "Quem compra e quando", exemplo: "qual faixa de idade e horário mais compram?" },
  };
  ```
  Ferramentas sem atalho (como `buscar_variante`) não aparecem.
- **Teclado:** ↑ e ↓ movem, Enter escolhe (preenche o campo com o exemplo e seleciona o texto para a pessoa editar), Esc fecha.
- **Acessibilidade:** `role="listbox"`, cada item `role="option"` com `aria-selected`. No textarea: `aria-controls` e `aria-activedescendant`.

### 7. Painel de foco (≥ 1100 px, só no modo página)

- Mostra as **propostas pendentes desta conversa**, com Confirmar e Rejeitar (reaproveite `PropostaCard`).
- É `sticky top-4`.
- Abaixo de 1100 px, o painel some e as propostas ficam **dentro** da mensagem do agente, como hoje.
- Vazio: "Nada para confirmar agora."

### 8. Topo e estado

- **Estado:**
  - "Disponível": ponto `bg-sinal-ok`.
  - "Trabalhando…": ponto violeta com `animate-pulse`, só se `!useMenosMovimento()`, enquanto `enviar.isPending`.
  - Sempre **com texto**, nunca só a cor (regra do Mídia UI).
- **Provedor:** se a resposta veio do `offline`, mostre um selo discreto "modo offline". Se veio do `claude`, mostre "IA". Assim a banca vê que o modo offline funciona.
- **Botões:** "Nova conversa" (`+`) e o menu ⋮ (histórico com título e data, "Limpar conversa").

### 9. Sugestões

Os mesmos exemplos de hoje (`EXEMPLOS_GERENTE` e `EXEMPLOS_ATENDENTE`) viram chips **acima** da caixa de envio, e somem depois da 1ª mensagem (como `.chat[data-conversa] .chat__sugestoes { display: none }`).

## Responsivo (obrigatório)

| Largura | Comportamento |
| --- | --- |
| ≥ 1100 px | Palco + painel de foco de 300 px |
| 640 a 1099 px | Só o palco; propostas dentro das mensagens |
| < 640 px | Balão do usuário a 92%; dica curta; botões de 44 px; o textarea não fica escondido pelo teclado (use `dvh` e a caixa no fim do flex) |
| Gaveta (celular) | Ocupa `h-[min(85dvh,100%)]`, sem `rounded-t-xl` (veja a P3-03) |

## Testes (Vitest + Testing Library)

- Enter envia no desktop. Shift+Enter não envia. Com `pointer: coarse` (mock do `matchMedia`), Enter não envia.
- "/" abre a barra; ↓ + Enter preenche o exemplo; Esc fecha.
- A mensagem do agente renderiza os **passos** e as **propostas**.
- "Parar" cancela: a requisição recebe um `signal` abortado.
- O rascunho volta ao reabrir a mesma conversa e some depois de enviar.
- Copiar chama `navigator.clipboard.writeText` (com mock).
- Os componentes de `components/midia/chat.tsx` não importam `api` (não fazem fetch).

## Pronto quando

- [ ] O visual segue a anatomia do Midia63 (coluna de 760 px, agente sem balão, usuário à direita, passos, copiar e hora), com tokens e geometria reta.
- [ ] Funcionam: histórico, nova conversa, abrir, limpar (com Dialog), barra "/", parar, rascunho e voz.
- [ ] Responde bem em 375, 768, 1280 e 1920 px; o painel de foco aparece em ≥ 1100 px.
- [ ] A gaveta e a página `/agente` usam o mesmo `ChatAgente`.
- [ ] Os testes passam, junto com `npm run typecheck` e `npm run build`. O bundle inicial não cresce: o chat continua lazy.
- [ ] O PR tem prints lado a lado (Midia63 × MidiaComercial) e um GIF curto da conversa.
