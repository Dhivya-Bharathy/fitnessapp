/**
 * Attempts to extract and parse JSON from a string, stripping markdown code fences first, then falling back to regex extraction.
 * @param text - The raw string potentially containing JSON.
 * @returns The parsed object of type T, or null if parsing fails.
 */
export function extractJSON<T>(text: string): T | null {
  if (!text) return null;

  try {
    const cleaned = text.replace(/```(?:json)?\s*/gi, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
