export const formatCredits = (value: string | number | null | undefined): string => {
  if (!value) return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toFixed(2);
};

export const formatApiCredits = (value: string | number | null | undefined): string => {
  if (!value) return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toFixed(2);
};
