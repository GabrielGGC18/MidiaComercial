# 19 · Roteiro do filme de 32 s e nova página pública

**Data:** 14/11/2026 · **Base:** `APRESENTACAO1.MD` v2.0 (direção da equipe, fora do repositório) · **Código:** `frontend/src/components/midia/filme.tsx` (prévia animada) e `roteiro.tsx` (as quatro telas)

## 1. Estado da entrega

| Item | Estado |
| --- | --- |
| Roteiro e storyboard | Pronto (este documento) |
| Prévia animada na página (animatic) | Pronta, sem áudio, identificada na tela como prévia |
| Vídeo MP4 16:9 e 9:16, posters e legendas VTT | **Não produzido** |
| Voz da funcionária e do assistente para o filme | **Não gravada** |

A prévia é a interface desenhada, movida por um relógio só. Não é gravação de uso real nem vídeo exportado.

## 2. Ideia do filme

**Nome:** "Essa conversa tem um próximo passo".

O filme mostra a mesma procura duas vezes:
1. **Só com o sistema da loja.** O caixa registra o que vendeu. A procura não tem campo e some.
2. **Com o MidiaComercial ao lado.** A fala vira campos, uma pessoa confirma, a contagem sobe e aparece um próximo passo.

O sistema da loja fica na tela do começo ao fim, sem mudar. A nossa camada entra ao lado: não troca o caixa.

**O que o filme não diz:**
- não mostra conexão direta com o sistema da loja; o saldo chega pela planilha enviada (conexão direta está em estudo);
- não termina em venda fechada nem em receita;
- não trata 6 procuras como 6 pessoas ou 6 vendas.

## 3. Dados do exemplo (fictícios)

| Campo | Valor |
| --- | --- |
| Produto | Calça jeans azul, tamanho 42 |
| Procuras anteriores | 5 (por dia: 1, 0, 1, 1, 0, 2, 0) |
| Nova procura | 1 (último dia) |
| Total | 6, nos últimos 7 dias |
| Saldo informado | 0, pela planilha da loja, às 09h |
| Próximo passo | Conferir o estoque e consultar o fornecedor |

São os mesmos dados dos cards, da cena da rotina e da demonstração do balcão.

## 4. Roteiro, cena por cena

| Tempo | Título na tela | Sistema da loja (esquerda) | MidiaComercial (direita) | Legenda |
| --- | --- | --- | --- | --- |
| 00–04 s | O cliente pediu. Não tinha. | Vendas de hoje 14; "Procuras sem estoque: sem campo". Chega a fala do cliente | Ainda não aparece | Uma procura no balcão, num dia corrido. |
| 04–09 s | Só com o sistema da loja | A linha "sem campo" acende em coral. Aos 6,8 s a fala fica riscada: "A procura ficou sem registro" | Ainda não aparece | O caixa registra o que vendeu. A procura não tem onde ficar. |
| 09–14 s | Com o MidiaComercial ao lado | Igual | O painel entra ao lado. Fala da funcionária; os termos "calça jeans azul", "42" e "não tinha" acendem um a um | Funcionária: "Procuraram calça jeans azul, tamanho 42, e não tinha." |
| 14–19 s | A fala vira campos para conferir | Igual | Produto, Cor, Tamanho e Motivo se preenchem em sequência. Estado: "Para conferir" | Assistente: "Calça jeans azul, 42. Item indisponível. Confere?" |
| 19–22 s | Uma pessoa confirma | Igual | Resposta da funcionária. Aos 20,5 s o estado vira "Registrado (simulação)" | Funcionária: "Confere. Pode registrar." |
| 22–27 s | Agora a loja consegue voltar a esse sinal | Aos 24,5 s: "Planilha de estoque enviada: saldo 0" | Contagem de 5 para 6 aos 23,5 s; só a barra do último dia muda (coral). Depois, "Saldo informado: 0" | De 5 para 6 procuras nos últimos 7 dias. O saldo vem da planilha da loja. |
| 27–32 s | Um próximo passo, com motivo | Igual | "Conferir o estoque e consultar o fornecedor." com a limitação. Aos 29,5 s: "Sua equipe conversa. A loja decide." | Sua equipe conversa. A loja decide. |

## 5. Regras da prévia

- **Começa só com clique.** Antes disso, mostra o poster com a chamada.
- **Um relógio só.** A tela depende apenas do tempo: pausar, voltar e recomeçar reconstroem a cena; a contagem nunca passa de 6.
- **Pausa sozinha** ao sair da tela ou ao ocultar a aba. Não retoma sozinha.
- **Termina parada** na última cena, sem repetir.
- **Controles reais fora do palco:** assistir ou pausar, voltar ao início e barra de posição.
- **Sem áudio:** a legenda de cada cena traz a fala por escrito.
- **Ensaio:** `/?filme=18` abre a prévia parada no segundo 18.

## 6. Página pública depois desta revisão

| Ordem | Bloco | Origem |
| --- | --- | --- |
| 1 | Abertura: "Sua loja sabe o que vende? E o porquê?" com a demonstração do balcão | Pedido do Gabriel em 13/11 |
| 2 | Problema: "O cliente pediu. Não tinha." | Foto 2 |
| 3 | Filme: prévia animada de 32 s | Foto 4 |
| 4 | Cinco cards com exemplo e ação | Foto 1 |
| 5 | Rotina da loja em três momentos | Foto 3 |
| 6 | Equipe e caminhos | — |

Saíram da página pública e do pitch: rotas de API, JSON, contratos, eventos e o bloco "Feito para ser auditado".

**Diferenças em relação ao `APRESENTACAO1.MD`, por decisão registrada:**
- a demonstração do balcão continua na abertura, porque o vídeo ainda não existe;
- o título da abertura é a frase pedida pelo Gabriel, e não "Sua equipe conversa. A loja entende o próximo passo.";
- o verde neon da logo 01 é o destaque da abertura; dentro das quatro telas valem roxo, lilás e coral;
- os títulos seguem em Plus Jakarta Sans (fonte da logo), e não em Inter.

## 7. Pendências

| Prioridade | Item |
| --- | --- |
| P0 | Gravar as vozes e produzir o MP4 16:9 e 9:16, com posters e VTT; trocar a prévia pelo vídeo |
| P1 | Botões dos cards abrirem a demonstração no capítulo exato (hoje levam ao início dela) |
| P1 | Conferir as telas novas em 320, 768 e 1024 px e no tema claro |
| P1 | Um só foco de som entre filme, demonstração e exemplos, quando o filme tiver áudio |
| P2 | Teste de compreensão com cinco pessoas do público (APRESENTACAO1 §17.6) |
