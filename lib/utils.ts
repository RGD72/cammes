import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes Tailwind respeitando precedência e remove duplicatas/conflitos.
 * Padrão shadcn/ui — usado por todos os componentes em `components/ui/`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
