declare module 'node:child_process' {
  export function execFile(
    file: string,
    args: string[],
    options: { cwd?: string },
    callback: (error: Error | null, stdout: string, stderr: string) => void,
  ): void;
}

declare module 'node:fs/promises' {
  export function access(path: string, mode?: number): Promise<void>;
  export function chmod(path: string, mode: number): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function readFile(path: string, encoding: 'utf8'): Promise<string>;
  export function readdir(path: string, options?: { withFileTypes?: false }): Promise<string[]>;
  export function readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  export function stat(path: string): Promise<{ isDirectory(): boolean; isFile(): boolean; mode: number }>;
  export function writeFile(path: string, data: string, options?: { mode?: number }): Promise<void>;

  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function extname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
  export const sep: string;
}

declare module 'node:process' {
  const process: {
    argv: string[];
    cwd(): string;
    exitCode?: number;
    stderr: { write(data: string): void };
    stdout: { write(data: string): void };
  };
  export default process;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}

declare const URL: {
  new (input: string, base?: string): URL;
};

interface URL {
  href: string;
}
