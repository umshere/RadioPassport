/**
 * Directory records often spell a place in lower case ("kerala"). A name with
 * no capital at all gets one per word; anything already cased is left as sent.
 */
export function titlePlace(place: string): string {
  if (!place || /\p{Lu}/u.test(place)) return place;
  return place.replace(/(^|[\s\-/(])(\p{Ll})/gu, (_, lead: string, letter: string) => `${lead}${letter.toLocaleUpperCase()}`);
}
