import { envConfigs } from '@/config';

import { closePostgresDb, getPostgresDb } from './postgres';
import { getSqliteDb } from './sqlite';

const sqliteCompatProxyCache = new WeakMap<object, any>();

/**
 * SQLite/Turso compatibility shim:
 * - SQLite doesn't support row-level locking; Drizzle's select builder may not implement `.for()`.
 *   We polyfill `.for(...)` as a no-op to keep call sites portable.
 */
function withSqliteCompat<T extends object>(dbInstance: T): T {
  if (dbInstance && typeof dbInstance === 'object') {
    const cached = sqliteCompatProxyCache.get(dbInstance);
    if (cached) return cached as T;
  }

  const wrapQuery = (query: any) => {
    if (!query || typeof query !== 'object') return query;

    return new Proxy(query, {
      get(target, prop, receiver) {
        // `.for('update')` is not meaningful in SQLite; treat it as no-op when missing.
        if (prop === 'for' && typeof (target as any).for !== 'function') {
          return (..._args: any[]) => receiver;
        }

        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') return value;

        return (...args: any[]) => {
          const res = value.apply(target, args);
          return wrapQuery(res);
        };
      },
    });
  };

  const proxied = new Proxy(dbInstance, {
    get(target, prop, receiver) {
      // Wrap transaction callback so `tx` is also shimmed.
      if (prop === 'transaction') {
        const original = Reflect.get(target, prop, receiver);
        if (typeof original !== 'function') return original;
        return (fn: any, ...rest: any[]) =>
          original.call(target, (tx: any) => fn(withSqliteCompat(tx)), ...rest);
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;

      // Wrap select builders so `.for()` can be polyfilled on the built query.
      if (typeof prop === 'string' && prop.startsWith('select')) {
        return (...args: any[]) => wrapQuery(value.apply(target, args));
      }

      return value.bind(target);
    },
  }) as any as T;

  if (dbInstance && typeof dbInstance === 'object') {
    sqliteCompatProxyCache.set(dbInstance, proxied);
  }

  return proxied;
}

/**
 * Universal DB accessor.
 *
 * Drizzle returns different DB types for Postgres vs SQLite/libsql.
 * If we return a union here, TypeScript can't call methods like `db().insert(...)`
 * because the overloads are incompatible across dialects.
 *
 * So we intentionally return `any` to keep call sites stable.
 */
export function db(): any {
  if (['sqlite', 'turso'].includes(envConfigs.database_provider)) {
    return withSqliteCompat(getSqliteDb() as any);
  }

  return getPostgresDb() as any;
}

export function dbPostgres(): ReturnType<typeof getPostgresDb> {
  if (envConfigs.database_provider !== 'postgresql') {
    throw new Error('Database provider is not PostgreSQL');
  }

  return getPostgresDb();
}

export function dbSqlite(): ReturnType<typeof getSqliteDb> {
  if (!['sqlite', 'turso'].includes(envConfigs.database_provider)) {
    throw new Error('Database provider is not SQLite');
  }

  return getSqliteDb();
}

export async function closeDb() {
  if (envConfigs.database_provider === 'postgresql') {
    await closePostgresDb();
    return;
  }
}
