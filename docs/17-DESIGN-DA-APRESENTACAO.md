# 17 · Design da apresentação na página inicial

**Data:** 13/11/2026 · **Origem:** refino de `melhoria-design.md` e `ANIMACAO-Tela.md`, escritos pela equipe · **Código:** `frontend/src/features/apresentacao/`, `frontend/src/features/home/`

## 1. A ideia, em uma frase

A pessoa entende o MídiaComercial **assistindo a uma conversa**: o funcionário fala, o assistente confere, o registro entra, o número muda e aparece uma decisão que o lojista revisa.

- **Mensagem:** "Sua equipe fala. O MídiaComercial organiza o próximo passo."
- **Apoio:** "Veja uma conversa virar registro, informação da loja e uma ação que o vendedor revisa."
- **Ações na abertura:**
  - "Assistir à demonstração" (principal);
  - "Entrar na loja".
- **Ações dentro do palco:**
  - "Ouvir apresentação" e "Assistir sem som";
  - pausa e retomada;
  - progresso clicável;
  - recomeçar.

## 2. O que mudou em relação às duas propostas

| Proposta | Decisão | Por quê |
| --- | --- | --- |
| Percurso principal = venda + pós-venda (ANIMACAO-Tela) | **Principal = procura sem estoque registrada por voz no balcão.** O pós-venda virou a 2ª aba, com o selo "em evolução" | O balcão já existe no produto. O gatilho de pós-venda por compra recente (PV-07) ainda não. A demo não promete o que não está pronto |
| GSAP Timeline (as duas propostas) | **Motion + relógio próprio** (`useRelogio`) | A regra do docs/08 §4 continua: o GSAP não entra no projeto. O relógio único já resolve pausar, continuar do ponto exato, pular e recomeçar. Um só motor anima cada elemento |
| Áudio gravado por pessoas | **Voz sintética do Windows (Maria, pt-BR)**, gerada por `scripts/gerar-audio-percurso.py`. A voz do funcionário é a mesma, só que mais grave | Não havia gravação. A tela diz "voz sintética" e a legenda é exatamente o texto falado. Para trocar por gravação real, basta substituir os MP3 e rodar o script, que recalcula a onda |
| Onda do áudio | **Picos reais do arquivo** (40 por fala), com o progresso tirado da posição do relógio | Barras aleatórias não representam a voz (melhoria-design §7) |
| Fundo da página | **Aero Shards** (React Bits), reimplementado em Canvas 2D | O original usa WebGPU (`vgpu`, cerca de 2.300 linhas) e não roda em vários celulares. A versão daqui: cerca de 110 estilhaços a 30 fps, só atrás da abertura, pausa fora da tela, fica parada com "menos movimento" e muda com o tema |
| Abas "Conversa / Resultado" no celular | **Uma sequência vertical:** conversa e, embaixo, o resultado | As abas escondiam a relação entre causa e resultado |
| "organizando a próxima etapa…" | **Removido** | Era sinal de processamento sem operação real por trás |
| Banner de vídeo (AgroMídia) | **Adiado** | O arquivo enviado é um print com marca d'água do Windows. Entra quando houver o MP4 e o poster aprovados (contrato em melhoria-design §8). Com ele vem o controle que impede som simultâneo: o anúncio pausa enquanto a conversa toca |
| Teste com o microfone do visitante | **Adiado (P2)** | Pede permissão, tratamento de erro e suporte por navegador. Fica no ambiente logado (`useVoz` do balcão) |

## 3. Roteiro do percurso principal (cerca de 38 s com respiros)

| # | Quem fala | O que aparece | Regra |
| --- | --- | --- | --- |
| 1 | Funcionário: "Anota: procuraram calça jeans azul, tamanho 42, e não tinha." | Bolha de voz com onda e duração | — |
| 2 | Assistente: "Entendi. Calça jeans azul, 42, sem estoque. Confere?" | Produto, cor, tamanho e motivo entram um a um (marca coral) | — |
| 3 | **Espera** | Botão "Confirmar registro" | **Modo explorável (padrão):** o relógio para até o clique. **Modo guiado:** a fala "Isso, pode registrar." toca, com o aviso "simulação guiada" |
| 4 | Assistente: "Registrado. Agora são 6 procuras desse item nesta semana." | Contador 5 → 6 e gráfico de 7 dias, com hoje em coral | Entra **uma vez**; voltar ou pular não soma de novo |
| 5 | Assistente: "O saldo informado está zerado…" | Aviso "Saldo informado: 0 · importado ontem, 18h" | — |
| 6 | Funcionário: "O que eu faço com isso?" | — | — |
| 7 | Assistente: "Confira o estoque e consulte o fornecedor… Você decide se cria uma ação." | Cartão "Falta no estoque" com o próximo passo, a limitação, "Criar ação" e "Ver evidências" | Termina parado e revisável |

## 4. Regras que o código garante (com teste)

- **Estado = função pura da posição:** `estadoBalcao(pos, confirmado)` e `estadoNo(cenário, capítulo, escolhas)`.
- **Confirmação explícita:**
  - sem confirmar, nada é registrado, nem depois do tempo total;
  - voltar para antes da confirmação invalida o registro.
- **Pausa:**
  - pausar congela o relógio e o áudio; continuar segue do mesmo ponto;
  - no pós-venda, o restante do capítulo é guardado.
- **Pausas automáticas:** trocar de aba ou rolar o palco para fora da tela também pausa. Rolar a página nunca move o áudio.
- **Som:** só toca depois de um clique. Se o navegador bloquear, aparece "Toque para ouvir" e o percurso segue pela legenda.
- **Modo apresentação:** palco escuro em tela cheia. O Esc fecha e devolve o foco ao botão que abriu.

## 5. Layout

- **Grade:** largura máxima de 1280 px. O título, o palco e as seções seguem o mesmo alinhamento.
- **Abertura compacta:**
  - no desktop, o texto fica à esquerda e as ações à direita;
  - o palco começa dentro da primeira dobra a 1440 × 1000.
- **Palco:**
  - conversa em 42% e resultado em 58%;
  - sem rolagem interna: aparecem as 3 últimas falas, e "Ver N mensagens anteriores" abre o resto.
- **Um foco por vez:** registro → número e gráfico → decisão. A borda violeta marca o bloco ativo.
- **Texto da conversa:** 16 px. O funcionário fica à direita (violeta) e o assistente à esquerda, com o nome escrito em cada bolha, não só a cor.

**Conferido** com o Chrome headless no build de produção, a 1440 px e 375 px.

## 6. Pendências

| Prioridade | Item |
| --- | --- |
| P1 | Trocar a voz sintética por uma gravação real da equipe, rodando o mesmo script |
| P1 | Banner de vídeo e controle de foco sonoro, quando o MP4 e o poster aprovados existirem |
| P1 | Conferir no projetor 16:9 e no tema claro durante o ensaio |
| P2 | Teste com a voz do visitante (microfone), com permissão e tratamento de erro |
