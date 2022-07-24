export default function appendAffectedKey (affectedKey: string | null | undefined, key: string) {
  if (key === '$each') return affectedKey
  return affectedKey ? `${affectedKey}.${key}` : key
}
