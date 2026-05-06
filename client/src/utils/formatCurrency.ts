export const formatCurrency = (value: number | null | undefined, currency = 'USD', locale = 'en-US') => {
  if (value) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(value);
  }
  return '';
};
