import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { handoff } from '../src/index.ts';

const originalNodeEnv = process.env.NODE_ENV;
const originalProcess = globalThis.process;
const originalWarn = console.warn;
const originalError = console.error;

afterEach(() => {
  globalThis.process = originalProcess;
  process.env.NODE_ENV = originalNodeEnv;
  console.warn = originalWarn;
  console.error = originalError;
});

describe('handoff()', () => {
  it('returns a callable wrapper that runs the fallback and returns its value', () => {
    let calls = 0;

    const wrapped = handoff({
      id: 'settings-export-csv',
      title: 'Export Data',
      fallback: () => {
        calls += 1;
        return 42;
      },
    });

    assert.equal(typeof wrapped, 'function');
    assert.equal(wrapped(), 42);
    assert.equal(calls, 1);
  });

  it('supports async fallbacks', async () => {
    const wrapped = handoff({
      id: 'fetch-user-data',
      title: 'Fetch User Data',
      fallback: async () => 'done',
    });

    await assert.doesNotReject(async () => {
      assert.equal(await wrapped(), 'done');
    });
  });

  it('rejects non-object arguments so the API stays object-form only', () => {
    assert.throws(
      () => handoff('not-an-object' as never),
      /single object argument/i,
    );
  });

  it('warns in development mode before running the fallback', () => {
    const warnings: string[] = [];
    let didRun = false;

    process.env.NODE_ENV = 'development';
    console.warn = (...args: unknown[]) => {
      warnings.push(args.join('\n'));
    };

    const wrapped = handoff({
      id: 'test-handoff',
      title: 'Test Handoff',
      description: 'Test description',
      fallback: () => {
        didRun = true;
        return 'ok';
      },
    });

    assert.equal(wrapped(), 'ok');
    assert.equal(didRun, true);
    assert.deepEqual(warnings, [
      '[Threadline] Handoff triggered: "Test Handoff"\nDescription: Test description\nID: test-handoff\nThis should be implemented by an engineer.',
    ]);
  });

  it('stays quiet in production mode while still running the fallback', () => {
    const warnings: string[] = [];
    let didRun = false;

    process.env.NODE_ENV = 'production';
    console.warn = (...args: unknown[]) => {
      warnings.push(args.join('\n'));
    };

    const wrapped = handoff({
      id: 'prod-handoff',
      title: 'Prod Handoff',
      fallback: () => {
        didRun = true;
        return 'ok';
      },
    });

    assert.equal(wrapped(), 'ok');
    assert.equal(didRun, true);
    assert.deepEqual(warnings, []);
  });

  it('runs fallback in browser-like environments without process', () => {
    let didRun = false;
    console.warn = () => {
      throw new Error('should not warn without development env');
    };
    (globalThis as typeof globalThis & { process?: NodeJS.Process }).process = undefined;

    const wrapped = handoff({
      id: 'browser-fallback',
      title: 'Browser Fallback',
      fallback: () => {
        didRun = true;
        return 'ok';
      },
    });

    assert.equal(wrapped(), 'ok');
    assert.equal(didRun, true);
  });

  it('logs fallback failures in development and does not rethrow them', () => {
    const errors: unknown[][] = [];

    process.env.NODE_ENV = 'development';
    console.warn = () => {};
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };

    const wrapped = handoff({
      id: 'sync-failure',
      title: 'Sync Failure',
      fallback: () => {
        throw new Error('boom');
      },
    });

    assert.equal(wrapped(), undefined);
    assert.equal(errors.length, 1);
    assert.match(String(errors[0]?.[0]), /fallback failed/i);
  });

  it('swallows async fallback failures and reports them in development', async () => {
    const errors: unknown[][] = [];

    process.env.NODE_ENV = 'development';
    console.warn = () => {};
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };

    const wrapped = handoff({
      id: 'async-failure',
      title: 'Async Failure',
      fallback: async () => {
        throw new Error('async boom');
      },
    });

    await assert.doesNotReject(async () => {
      assert.equal(await wrapped(), undefined);
    }, /async boom/);
    assert.equal(errors.length, 1);
  });

  it('stays quiet in production when fallback failures happen', () => {
    process.env.NODE_ENV = 'production';
    console.warn = () => {};
    console.error = () => {
      throw new Error('should not be called');
    };

    const wrapped = handoff({
      id: 'prod-failure',
      title: 'Prod Failure',
      fallback: () => {
        throw new Error('boom');
      },
    });

    assert.equal(wrapped(), undefined);
  });
});
