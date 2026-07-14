import type { HandoffOptions, HandoffWrapper } from './types.ts';

const DEVELOPMENT_ENV = 'development';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateOptions<T>(options: unknown): asserts options is HandoffOptions<T> {
  if (!isRecord(options)) {
    throw new TypeError(
      'handoff() expects a single object argument with id, title, description, and fallback properties.',
    );
  }

  if (typeof options.id !== 'string' || options.id.trim() === '') {
    throw new TypeError('handoff() requires a non-empty string id.');
  }

  if (typeof options.title !== 'string' || options.title.trim() === '') {
    throw new TypeError('handoff() requires a non-empty string title.');
  }

  if (
    options.description !== undefined &&
    typeof options.description !== 'string'
  ) {
    throw new TypeError('handoff() description must be a string when provided.');
  }

  if (typeof options.fallback !== 'function') {
    throw new TypeError('handoff() requires a callable fallback function.');
  }
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV === DEVELOPMENT_ENV;
}

function warnInvocation({ id, title, description }: HandoffOptions<unknown>): void {
  console.warn(
    [
      `[Threadline] Handoff triggered: "${title}"`,
      `Description: ${description ?? ''}`,
      `ID: ${id}`,
      'This should be implemented by an engineer.',
    ].join('\n'),
  );
}

function reportFallbackFailure(
  { id, title }: HandoffOptions<unknown>,
  error: unknown,
): void {
  if (!isDevelopment()) {
    return;
  }

  console.error(
    `[Threadline] Handoff fallback failed: "${title}"`,
    `ID: ${id}`,
    error,
  );
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

export function handoff<T = void>(options: HandoffOptions<T>): HandoffWrapper<T> {
  validateOptions(options);

  return function handoffWrapper() {
    if (isDevelopment()) {
      warnInvocation(options);
    }

    try {
      const result = options.fallback();

      if (isPromiseLike(result)) {
        return result.catch((error) => {
          reportFallbackFailure(options, error);
          return undefined;
        });
      }

      return result;
    } catch (error) {
      reportFallbackFailure(options, error);
      return undefined;
    }
  };
}
