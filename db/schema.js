export function hasColumn(instance, table, col) {
  const row = instance.prepare(`PRAGMA table_info(${table})`).all().find(c => c.name === col);
  return !!row;
}
