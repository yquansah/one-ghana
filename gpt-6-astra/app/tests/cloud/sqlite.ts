import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
/** Real SQLite with D1's prepared-statement/batch shape, including transaction rollback. */
export function createTestDB(
  migrations = [
    '0001_accounts_campaigns.sql',
    '0002_research_notifications.sql',
  ],
) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const name of migrations)
    sqlite.exec(
      readFileSync(
        new URL('../../migrations/' + name, import.meta.url),
        'utf8',
      ),
    );
  class Statement {
    constructor(
      readonly sql: string,
      readonly values: SQLInputValue[] = [],
    ) {}
    bind(...values: SQLInputValue[]) {
      return new Statement(this.sql, values);
    }
    result() {
      const statement = sqlite.prepare(this.sql);
      const results = statement.all(...this.values);
      return {
        success: true,
        results,
        meta: {
          changes: Number(sqlite.prepare('SELECT changes() AS n').get()!.n),
        },
      };
    }
    async all() {
      return this.result();
    }
    async first(column?: string) {
      const result = sqlite.prepare(this.sql).get(...this.values);
      return result ? (column ? result[column] : result) : null;
    }
    async run() {
      return this.result();
    }
  }
  const db = {
    prepare: (sql: string) => new Statement(sql),
    batch: async (statements: Statement[]) => {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map((s) => s.result());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    exec: async (sql: string) => {
      sqlite.exec(sql);
      return { count: 1, duration: 0 };
    },
  } as unknown as D1Database;
  return { db, sqlite, close: () => sqlite.close() };
}
