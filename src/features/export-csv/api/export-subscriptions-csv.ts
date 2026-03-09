import type Stripe from "stripe";

const csvHeaders = [
  "name",
  "postal_code",
  "line1",
  "line2",
  "city",
  "state",
  "country",
] as const;
interface Address {
  city: string | null;
  country: string | null;
  line1: string | null;
  line2: string | null;
  postal_code: string | null;
  state: string | null;
}
interface Shipping {
  address?: Address;
  carrier?: string | null;
  name?: string;
  phone?: string | null;
  tracking_number?: string | null;
}

const removeAccents = (str: string | null | undefined) => {
  if (!str) return str;
  let s = str.replace(/ẞ/g, "SS").replace(/ß/g, "ss");
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s;
};

const formatCityName = (shipping: Shipping | null | undefined) => {
  if (
    ["US", "CA", "AU", "GB", "NZ"].includes(shipping?.address?.country || "") &&
    shipping?.address?.city &&
    shipping?.address?.state
  ) {
    return `${shipping?.address?.city} ${shipping?.address?.state}`;
  }
  return shipping?.address?.city || "";
};

export function getCsvRowFromShipping(
  shipping: Shipping | null | undefined
): Record<(typeof csvHeaders)[number], string> {
  return {
    name: removeAccents(shipping?.name) || "",
    postal_code: shipping?.address?.postal_code || "",
    line1: removeAccents(shipping?.address?.line1) || "",
    line2: removeAccents(shipping?.address?.line2) || "",
    city: removeAccents(formatCityName(shipping)) || "",
    state: removeAccents(shipping?.address?.state) || "",
    country: shipping?.address?.country || "",
  };
}

const escapeCsvValue = (
  value: string | null | undefined,
  separator: string = ","
): string => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (
    stringValue.includes(separator) ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

/**
 * Wraps a value as an Excel/Numbers formula that returns a text string.
 * e.g. "06000" → ‹="06000"› which Excel evaluates as the string "06000",
 * preserving any leading zeros.
 */
const asFormula = (value: string): string => {
  if (!value) return "";
  return `="${value}"`;
};

const triggerDownload = (content: string, filename: string): void => {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

interface CsvOptions {
  separator: string;
  useFormula: boolean;
}

const buildCsvContent = (
  subscriptions: Stripe.Subscription[],
  options: CsvOptions
): string => {
  const { separator, useFormula } = options;

  const rows = subscriptions.map((subscription) => {
    const customer = subscription.customer as Stripe.Customer;
    const shipping = customer.shipping as Shipping | undefined;
    return getCsvRowFromShipping(shipping);
  });

  return [
    csvHeaders.join(separator),
    ...rows.map((row) =>
      csvHeaders
        .map((header) => {
          let value = row[header];
          if (useFormula && header === "postal_code" && value) {
            value = asFormula(value);
          }
          return escapeCsvValue(value, separator);
        })
        .join(separator)
    ),
  ].join("\n");
};

/**
 * Export 1 : CSV séparé par des virgules, avec formule ="value" pour postal_code.
 * La formule force Excel/Numbers à traiter le code postal comme du texte,
 * préservant les zéros initiaux (ex: 06000).
 */
export const exportCsvCommaFormula = (
  subscriptions: Stripe.Subscription[],
  filename: string = "subscriptions-formule-virgule.csv"
): void => {
  triggerDownload(
    buildCsvContent(subscriptions, { separator: ",", useFormula: true }),
    filename
  );
};

/**
 * Export 2 : CSV séparé par des points-virgules, avec formule ="value" pour postal_code.
 * Le point-virgule est le séparateur par défaut d'Excel en configuration française.
 */
export const exportCsvSemicolonFormula = (
  subscriptions: Stripe.Subscription[],
  filename: string = "subscriptions-formule-pointvirgule.csv"
): void => {
  triggerDownload(
    buildCsvContent(subscriptions, { separator: ";", useFormula: true }),
    filename
  );
};

/**
 * Export 3 : CSV standard séparé par des virgules, sans formule.
 * Export de référence / fallback.
 */
export const exportCsvStandard = (
  subscriptions: Stripe.Subscription[],
  filename: string = "subscriptions-standard.csv"
): void => {
  triggerDownload(
    buildCsvContent(subscriptions, { separator: ",", useFormula: false }),
    filename
  );
};
