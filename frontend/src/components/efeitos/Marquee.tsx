// Inspirado em React Bits "LogoLoop" (MIT + Commons Clause). CSS puro: o conteúdo é duplicado e
// desliza em loop; pausa com o mouse. Com movimento reduzido vira uma lista estática que quebra linha.
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export function Marquee({ itens, className }: { itens: React.ReactNode[]; className?: string }) {
  const menos = useMenosMovimento();
  if (menos) {
    return <ul className={cn("flex flex-wrap justify-center gap-x-8 gap-y-2 py-4", className)}>{itens.map((x, i) => <li key={i}>{x}</li>)}</ul>;
  }
  const faixa = (copia: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={copia || undefined}>
      {itens.map((x, i) => <li key={i} className="shrink-0">{x}</li>)}
    </ul>
  );
  return (
    <div className={cn("efeito-marquee group flex overflow-hidden py-4", className)}>
      <div className="efeito-marquee-trilho flex group-hover:[animation-play-state:paused]">
        {faixa(false)}
        {faixa(true)}
      </div>
    </div>
  );
}
