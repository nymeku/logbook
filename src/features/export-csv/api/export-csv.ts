import type Stripe from "stripe";

/**
 * Retourne les données CSV dans le bon ordre et formatage à partir d'une adresse Stripe.
 * @param address L'adresse au format Stripe.
 * @returns tableau de chaînes correspondant : [Prénom, Nom, Rue, Code postal, Ville, Dép/Region, Pays]
 */
export function getCsvRowFromAddress(
  address: Address | null | undefined
): string[] {
  if (!address) {
    return ["", "", "", "", "", "", ""];
  }
  // Prénom, Nom, Rue, Code postal, Ville, Dép/Region, Pays (dans cet ordre)
  // Pas d'info directe pour prénom/nom : à adapter ou laisser vide selon les données réelles
  // city = Ville, state = Dép/Region, line1/line2 = Rue, postal_code = Code postal, country = Pays

  // Pour bonus : concaténer "city state" dans "Ville" si country == "US"
  let ville = address.city || "";
  const region = address.state || "";

  if (address.country === "US" && ville && region) {
    ville = `${ville} ${region}`;
  }

  // Rue : line1 + (line2 si existe)
  let rue = address.line1 || "";
  if (address.line2) {
    rue = rue ? `${rue}, ${address.line2}` : address.line2;
  }

  return [
    "", // Prénom (si info ailleurs, à remplir)
    "", // Nom (si info ailleurs, à remplir)
    rue,
    address.postal_code || "",
    ville,
    region,
    address.country || "",
  ];
}

// Interface Address (copiée de customers-list.tsx)
interface Address {
  city: string | null;
  country: string | null;
  line1: string | null;
  line2: string | null;
  postal_code: string | null;
  state: string | null;
}

// Interface Shipping (copiée de customers-list.tsx)
interface Shipping {
  address?: Address;
  carrier?: string | null;
  name?: string;
  phone?: string | null;
  tracking_number?: string | null;
}

// Helper: Format shipping address as one line (copié de customers-list.tsx)
const formatShippingAddress = (
  shipping: Shipping | null | undefined
): string => {
  if (!shipping?.address) return "";
  const address = shipping.address;
  const parts: string[] = [];
  if (address.line1) parts.push(address.line1);
  if (address.line2) parts.push(address.line2);
  const cityStatePostal = [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(", ");
  if (cityStatePostal) parts.push(cityStatePostal);
  if (address.country) parts.push(address.country);
  return parts.join(" | ");
};

// Helper: Échapper les valeurs CSV (gérer les virgules, guillemets, retours à la ligne)
const escapeCsvValue = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  // Si la valeur contient une virgule, un guillemet ou un retour à la ligne, l'entourer de guillemets
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    // Échapper les guillemets en les doublant
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

/**
 * Exporte la liste des clients au format CSV et déclenche le téléchargement
 * @param customers - Tableau de clients Stripe à exporter
 * @param filename - Nom du fichier (optionnel, par défaut: "customers-export.csv")
 */
export const exportCustomersToCsv = (
  customers: Stripe.Customer[],
  filename: string = "customers-export.csv"
): void => {
  // En-têtes CSV
  const headers = [
    "Email",
    "Name",
    "Shipping Name",
    "Shipping Address",
    "Carrier",
    "Tracking #",
    "Phone",
  ];

  // Créer les lignes CSV
  const rows = customers.map((customer) => {
    const shipping = customer.shipping as Shipping | undefined;
    return [
      escapeCsvValue(customer.email),
      escapeCsvValue(customer.name),
      escapeCsvValue(shipping?.name),
      escapeCsvValue(formatShippingAddress(shipping)),
      escapeCsvValue(shipping?.carrier),
      escapeCsvValue(shipping?.tracking_number),
      escapeCsvValue(shipping?.phone),
    ];
  });

  // Combiner les en-têtes et les lignes
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
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
