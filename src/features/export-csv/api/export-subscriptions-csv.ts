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
  return str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
    postal_code:
      shipping?.address?.postal_code != null
        ? shipping.address.postal_code.padStart(5, "0")
        : "",
    line1: removeAccents(shipping?.address?.line1) || "",
    line2: removeAccents(shipping?.address?.line2) || "",
    city: removeAccents(formatCityName(shipping)) || "",
    state: removeAccents(shipping?.address?.state) || "",
    country: shipping?.address?.country || "",
  };
}

// Helper: Échapper les valeurs CSV (gérer les virgules, guillemets, retours à la ligne)
// For postal_code, always force Excel to treat as text
const escapeCsvValue = (
  value: string | null | undefined,
  columnName?: string
): string => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  // Always wrap postal_code column in ="value" to preserve leading zeros in Excel
  if (columnName === "postal_code" && stringValue !== "") {
    return `="${stringValue.replace(/"/g, '""')}"`;
  }
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

/**
 * Exporte la liste des subscriptions au format CSV et déclenche le téléchargement
 * @param subscriptions - Tableau de subscriptions Stripe à exporter
 * @param filename - Nom du fichier (optionnel, par défaut: "subscriptions-export.csv")
 */
export const exportSubscriptionsToCsv = (
  subscriptions: Stripe.Subscription[],
  filename: string = "subscriptions-export.csv"
): void => {
  const rows = subscriptions.map((subscription) => {
    const customer = subscription.customer as Stripe.Customer;
    const shipping = customer.shipping as Shipping | undefined;
    return getCsvRowFromShipping(shipping);
  });

  const csvContent = [
    csvHeaders.join(","),
    ...rows.map((row) =>
      csvHeaders.map((header) => escapeCsvValue(row[header], header)).join(",")
    ),
  ].join("\n");

  // Créer un blob et déclencher le téléchargement
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Nettoyer l'URL de l'objet
  URL.revokeObjectURL(url);
};
