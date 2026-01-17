// Erzeugt einen in der DB EINDEUTIGEN Slug aus einem "Basis"-Slug.
// Falls "die-zeitmaschine" existiert, wird "die-zeitmaschine-2", dann "-3", ...
export function makeUniqueContentSlug(instance, baseSlug) {
  let slug = baseSlug || 'eintrag';

  const exists = s =>
    !!instance.prepare(`SELECT 1 FROM contents WHERE slug = ? LIMIT 1`).get(s);

  if (!exists(slug)) return slug;

  let i = 2;
  while (exists(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}
