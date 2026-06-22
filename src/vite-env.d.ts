/// <reference types="vite/client" />

declare module 'react' {
  export const StrictMode: (props: { children?: ReactNode }) => JSX.Element;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useState<T>(initialState: T): [T, (value: T) => void];
  export function act(callback: () => void): void;
  export type ReactNode = JSX.Element | string | number | null | undefined | ReactNode[];
}

declare module 'react-dom/client' {
  export function createRoot(container: HTMLElement): {
    render(children: import('react').ReactNode): void;
    unmount(): void;
  };
}

declare namespace JSX {
  interface IntrinsicElements {
    main: Record<string, unknown>;
    section: Record<string, unknown>;
    p: Record<string, unknown>;
    h1: Record<string, unknown>;
    nav: Record<string, unknown>;
    button: Record<string, unknown>;
    div: Record<string, unknown>;
  }
  type Element = unknown;
}

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;
declare const expect: (actual: unknown) => {
  toBe(expected: unknown): void;
  toContain(expected: string): void;
};

declare module '*.css';

declare module 'react/jsx-runtime' {
  export function jsx(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export function jsxs(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export const Fragment: unknown;
}
