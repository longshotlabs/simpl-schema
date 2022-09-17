export default function appendAffectedKey (affectedKey: string | null | undefined, key: string): string | null | undefined {
  if (key === '$each') return affectedKey
  return affectedKey == null ? key : `${affectedKey}.${key}`
}
