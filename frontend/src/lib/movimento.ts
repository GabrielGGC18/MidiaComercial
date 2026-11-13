// Hook único de "menos movimento" (docs/08 §8.1): com ele ligado, todo efeito vira estado final.
import { useSyncExternalStore } from "react";

const q = "(prefers-reduced-motion: reduce)";

const assinar = (cb: () => void) => {
  const m = window.matchMedia?.(q);
  m?.addEventListener("change", cb);
  return () => m?.removeEventListener("change", cb);
};

export const useMenosMovimento = () =>
  useSyncExternalStore(assinar, () => !!window.matchMedia?.(q).matches, () => false);

/** Dispositivo sem hover (toque): Spotlight fica desligado (docs/08 §7). */
const qToque = "(hover: none)";
const assinarToque = (cb: () => void) => {
  const m = window.matchMedia?.(qToque);
  m?.addEventListener("change", cb);
  return () => m?.removeEventListener("change", cb);
};
export const useToque = () =>
  useSyncExternalStore(assinarToque, () => !!window.matchMedia?.(qToque).matches, () => false);
