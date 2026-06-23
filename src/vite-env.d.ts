/// <reference types="vite/client" />

declare module 'react' {
  export const StrictMode: (props: { children?: ReactNode }) => JSX.Element;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((current: T) => T)) => void];
  export function act(callback: () => void | Promise<void>): void | Promise<void>;
  export type FormEvent = { preventDefault(): void };
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
    h2: Record<string, unknown>;
    h3: Record<string, unknown>;
    article: Record<string, unknown>;
    nav: Record<string, unknown>;
    button: Record<string, unknown>;
    div: Record<string, unknown>;
    form: Record<string, unknown>;
    label: Record<string, unknown>;
    input: Record<string, unknown>;
    textarea: Record<string, unknown>;
    ul: Record<string, unknown>;
    li: Record<string, unknown>;
    span: Record<string, unknown>;
  }
  type Element = unknown;
}

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;
declare const expect: (actual: unknown) => {
  toBe(expected: unknown): void;
  toContain(expected: string): void;
  toEqual(expected: unknown): void;
  toHaveLength(expected: number): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toThrow(expected?: string | RegExp): void;
  not: {
    toBe(expected: unknown): void;
    toContain(expected: string): void;
  };
};

declare module '*.css';

declare module 'react/jsx-runtime' {
  export function jsx(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export function jsxs(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export const Fragment: unknown;
}
