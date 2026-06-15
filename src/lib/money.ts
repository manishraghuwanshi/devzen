/**
 * Money formatting.
 *
 * `admin-backend` stores monetary columns as **whole currency units**, not minor units:
 * its `docs/database.md` states that an INR price of ₹12,999 is stored as `12999`, the
 * service layer comments "whole currency units … never minor units", and its test
 * fixtures use values like `42_000` for a luxury watch. So the integer the API returns
 * is the amount itself and must be rendered as-is.
 *
 * That is why there is exactly one conversion here — none. Formatting is delegated to
 * `Intl.NumberFormat` so grouping and the currency symbol follow the user's locale.
 */

/** Currencies offered in the product form picker. */
export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "JPY"];

/** Coerce anything the API hands us into a usable ISO-4217 code. */
export function normalizeCurrency(currency: string | null | undefined): string {
  const code = (currency ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "INR";
}

/**
 * Format a whole-unit amount, e.g. `formatMoney(12999, "INR")` -> `₹12,999`.
 *
 * Fraction digits are pinned to zero because the API only ever accepts integers
 * (`amountSchema` is `z.number().int()`), so a trailing `.00` would be noise.
 * Falls back to a plain string if the runtime rejects the currency code.
 */
export function formatMoney(amount: number, currency: string): string {
  const code = normalizeCurrency(currency);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}