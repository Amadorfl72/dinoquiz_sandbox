import es from './es.json';

export type Locale = 'es';

const resources: Record<Locale, typeof es> = { es };

const currentLocale: Locale = 'es';

export const strings = resources[currentLocale];
