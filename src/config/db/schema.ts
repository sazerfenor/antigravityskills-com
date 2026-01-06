/**
 * Schema 兼容层 - 重导出 SQLite/Turso schema
 *
 * 项目已全面迁移到 Turso，此文件保留用于向后兼容。
 * 原 PostgreSQL schema 已备份至 schema.postgres.ts
 *
 * 如需切回 PostgreSQL：
 * 1. 将此文件内容替换为 schema.postgres.ts 的内容
 * 2. 更新 DATABASE_PROVIDER 环境变量为 'postgresql'
 */
export * from './schema.sqlite';
