import type Stripe from "stripe";

/**
 * Extrait le prénom et le nom à partir d'une string (shipping.name).
 * - Si la string contient plusieurs mots : le premier = prénom, le reste = nom.
 * - Si la string contient un seul mot, prénom = string, nom = "".
 * - Si la string est vide ou non définie, les deux sont "".
 */
function splitName(fullName: string | undefined | null): [string, string] {
  if (!fullName) return ["", ""];
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], ""];
  return [parts[0], parts.slice(1).join(" ")];
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

/**
 * Retourne les données CSV dans le bon ordre et formatage à partir de shipping.
 * @param shipping L'objet shipping (contenant address et name).
 * @returns tableau de chaînes correspondant : [Prénom, Nom, Rue, Code postal, Ville, Dép/Region, Pays]
 */
export function getCsvRowFromShipping(
  shipping: Shipping | null | undefined
): string[] {
  const [prenom, nom] = splitName(shipping?.name);
  const address = shipping?.address;
  if (!address) {
    return [prenom, nom, "", "", "", "", ""];
  }
  // Ville/Region logiques
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
    prenom,
    nom,
    rue,
    address.postal_code || "",
    ville,
    region,
    address.country || "",
  ];
}

// Helper: Échapper les valeurs CSV (gérer les virgules, guillemets, retours à la ligne)
const escapeCsvValue = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
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
  // En-têtes CSV - respect strict de l'instruction
  const headers = [
    "Prénom",
    "Nom",
    "Rue",
    "Code postal",
    "Ville",
    "Dép/Region",
    "Pays",
  ];

  // Créer les lignes CSV
  const rows = subscriptions.map((subscription) => {
    const customer = subscription.customer as Stripe.Customer;
    const shipping = customer.shipping as Shipping | undefined;
    return getCsvRowFromShipping(shipping);
  });

  // Combiner les en-têtes et les lignes
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
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
