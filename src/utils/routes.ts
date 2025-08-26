export const ROUTE_BASE = '/app';

/**
 * Prefixes a subpath with the app's base route.
 * Examples:
 *   route() -> '/app'
 *   route('') -> '/app'
 *   route('/') -> '/app/'
 *   route('/solo/room/abc') -> '/app/solo/room/abc'
 */
export function route(subpath: string = ''): string {
  if (!subpath) return ROUTE_BASE;
  const needsSlash = !subpath.startsWith('/');
  return `${ROUTE_BASE}${needsSlash ? '/' : ''}${subpath}`;
}
