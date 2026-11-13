// Ponte entre efeitos (components/efeitos) e as telas (docs/08 §4.2): features usam estes nomes
// de domínio; trocar um efeito muda só aqui.
import { Aurora } from "@/components/efeitos/Aurora";
import { BlurText } from "@/components/efeitos/BlurText";
import { CardSwap } from "@/components/efeitos/CardSwap";
import { Marquee } from "@/components/efeitos/Marquee";
import { ClickSpark } from "@/components/efeitos/ClickSpark";
import { FadeContent } from "@/components/efeitos/FadeContent";
import { CLASSE_GRADIENTE, GradientText } from "@/components/efeitos/GradientText";
import { RotatingText } from "@/components/efeitos/RotatingText";
import { ShinyText } from "@/components/efeitos/ShinyText";
import { SpotlightCard } from "@/components/efeitos/SpotlightCard";
import { Squares } from "@/components/efeitos/Squares";
import { StarBorder } from "@/components/efeitos/StarBorder";

/** "Agente pensando…", "Processando planilha…" */
export const Processando = ShinyText;

/** Uma única ação principal por tela (StarBorder). */
export function AcaoPrincipal({ children, className }: { children: React.ReactNode; className?: string }) {
  return <StarBorder className={className}>{children}</StarBorder>;
}

// ListaAoVivo fica em ./lista-ao-vivo (carrega motion só nas telas que usam)

/** Card explorável (luz segue o cursor; desligado no toque). */
export const CartaoExploravel = SpotlightCard;

/** Fundo de grade "sinal" para login, escolha de loja e estados vazios. */
export const FundoGrade = Squares;

/** Única animação de texto do produto (título do login). */
export const TituloAnimado = BlurText;

/** Frases de sinais de venda, em CSS puro para o login. */
export const TextoEmRotacao = RotatingText;

/** Ênfase tipográfica com as cores da marca. */
export const TextoGradiente = GradientText;

/** Frases em rotação com o gradiente da marca aplicado em cada frase (seguro no Chrome). */
export function TextoEmRotacaoGradiente({ frases, className }: { frases: readonly [string, string, string, string]; className?: string }) {
  return <RotatingText frases={frases} className={className} classeItem={CLASSE_GRADIENTE} />;
}

/** Confirmação tátil de que gravou ("Registrar", "Confirmar", "Concluir"). */
export function Confirmacao({ children, tom = "violeta" }: { children: React.ReactNode; tom?: "violeta" | "coral" }) {
  return <ClickSpark cor={tom === "coral" ? "var(--color-coral-500)" : "var(--color-violeta-500)"}>{children}</ClickSpark>;
}

/** Entrada ao rolar (primeira vez). */
export const Entrada = FadeContent;

/** Fundo com brilhos suaves (aurora sem WebGL) para páginas públicas. */
export const FundoAurora = Aurora;

/** Pilha de cards que alternam sozinhos (CardSwap). */
export const PilhaAlternada = CardSwap;

/** Faixa rolante com as funcionalidades (LogoLoop). */
export const FaixaRolante = Marquee;
