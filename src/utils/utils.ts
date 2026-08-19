export function formatCurrency(
  amount: number,
  currency: string = "NGN",
  locale: string = "en-NG",
): string {
  console.log('[utils::formatCurrency] ENTER', { amount, currency, locale });
  const result = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
  console.log('[utils::formatCurrency] EXIT', { resultLength: result.length });
  return result;
}

export function formatNaira(amount: number): string {
  console.log('[utils::formatNaira] ENTER', { amount });
  const result = formatCurrency(amount, "NGN", "en-NG");
  console.log('[utils::formatNaira] EXIT', { resultLength: result.length });
  return result;
}

export function currencySymbol(currency: string) {
  console.log('[utils::currencySymbol] ENTER', { currency });
  switch (currency) {
    case "NGN":
      console.log('[utils::currencySymbol] branch: NGN');
      console.log('[utils::currencySymbol] EXIT', { symbol: 'NGN' });
      return "\u20A6";
    case "USD":
      console.log('[utils::currencySymbol] branch: USD');
      console.log('[utils::currencySymbol] EXIT', { symbol: 'USD' });
      return "$";
    case "EUR":
      console.log('[utils::currencySymbol] branch: EUR');
      console.log('[utils::currencySymbol] EXIT', { symbol: 'EUR' });
      return "\u20AC";
    case "GBP":
      console.log('[utils::currencySymbol] branch: GBP');
      console.log('[utils::currencySymbol] EXIT', { symbol: 'GBP' });
      return "\u00A3";
    case "JPY":
      console.log('[utils::currencySymbol] branch: JPY');
      console.log('[utils::currencySymbol] EXIT', { symbol: 'JPY' });
      return "\u00A5";
    default:
      console.log('[utils::currencySymbol] branch: default (unknown currency)');
      console.log('[utils::currencySymbol] EXIT', { symbol: 'default-NGN' });
      return "\u20A6";
  }
}
