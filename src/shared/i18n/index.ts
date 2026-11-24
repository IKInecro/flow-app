import { en } from './en'

/**
 * The interface ships in English only. `t` stays as the single lookup point so
 * more locales can be added later without touching every component.
 */
export function t(key: string): string {
  return en[key] ?? key
}
