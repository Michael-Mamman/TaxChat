export function formatCurrency(
  amount: number,
  currency: string = "NGN",
  locale: string = "en-NG",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNaira(amount: number): string {
  return formatCurrency(amount, "NGN", "en-NG");
}

export function currencySymbol(currency: string) {
  switch (currency) {
    case "NGN":
      return "\u20A6";
    case "USD":
      return "$";
    case "EUR":
      return "\u20AC";
    case "GBP":
      return "\u00A3";
    case "JPY":
      return "\u00A5";
    default:
      return "\u20A6";
  }
}
