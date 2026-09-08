export type Migration = {
	version: number;
	name: string;
	sql: string;
};

/**
 * Ordered schema migrations. Bump version when adding habit/journal tables.
 */
export const MIGRATIONS: Migration[] = [
	{
		version: 1,
		name: "foundation",
		sql: `
			CREATE TABLE IF NOT EXISTS schema_migrations (
				version INTEGER PRIMARY KEY,
				name TEXT NOT NULL,
				applied_at TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS meta (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);

			INSERT OR IGNORE INTO meta (key, value) VALUES
				('app', 'phantasmal'),
				('created_at', datetime('now'));
		`,
	},
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
