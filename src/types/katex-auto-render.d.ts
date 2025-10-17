// src/types/katex-auto-render.d.ts
declare module 'katex/contrib/auto-render' {
  type Delimiter = { left: string; right: string; display: boolean };
  interface AutoRenderOptions {
    delimiters?: Delimiter[];
    ignoredTags?: string[];
    ignoredClasses?: string[];
    errorColor?: string;
    throwOnError?: boolean;
    macros?: Record<string, string>;
  }
  export default function renderMathInElement(
    element: HTMLElement,
    options?: AutoRenderOptions
  ): void;
}
