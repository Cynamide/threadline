export interface HandoffOptions<T = void> {
  id: string;
  title: string;
  description?: string;
  fallback: () => T | Promise<T>;
}

export type HandoffWrapper<T = void> = () => T | Promise<T | void> | void;
