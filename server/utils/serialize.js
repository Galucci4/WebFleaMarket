/** Converts Firestore Timestamps to ISO strings for JSON responses. */
export default function serialize(data) {
  const out = {}
  for (const [key, value] of Object.entries(data)) {
    out[key] = value?.toDate ? value.toDate().toISOString() : value
  }
  return out
}
