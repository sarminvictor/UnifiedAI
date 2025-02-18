export const removeNullBytes = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.replace(/\x00/g, '').trim();
};

// Basic sanitization function for strings
export const sanitizeString = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')             // Remove BOM and invalid chars
    .trim();
};

// Specific sanitization for PostgreSQL text fields
export const prepareForPostgres = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .replace(/\x00/g, '') // Remove NULL bytes
    .replace(/[\uD800-\uDFFF]/g, '') // Remove surrogate pairs
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\uFFEF]/g, ' ') // Replace non-printable chars
    .trim();
};

// Number sanitization
export const sanitizeNumber = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  return num.toString()
    .replace(/[^0-9.-]/g, '')
    .replace(/^-+/, '-')
    .replace(/\.+/, '.')
    || '0';
};
