import type Stripe from "stripe";
import { searchable } from "../../../lib/ascii";

/** Ligne "à plat" utilisée par le tableau ET par l'export. */
export interface SubscriptionRow {
  id: string;
  status: Stripe.Subscription.Status;
  created: number;
  livemode: boolean;
  customerId: string;
  customerDeleted: boolean;
  email: string;
  customerName: string;
  shipName: string;
  phone: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  hasAddress: boolean;
  postalStartsWithZero: boolean;
  /** Texte concaténé, sans accent, en minuscules, pour la recherche */
  haystack: string;
}

export const toSubscriptionRow = (sub: Stripe.Subscription): SubscriptionRow => {
  const rawCustomer = sub.customer;
  const customer =
    typeof rawCustomer === "object" && rawCustomer && !rawCustomer.deleted
      ? (rawCustomer as Stripe.Customer)
      : null;
  const customerId =
    typeof rawCustomer === "string" ? rawCustomer : (rawCustomer?.id ?? "");
  const shipping = customer?.shipping ?? null;
  const address = shipping?.address ?? null;

  const row = {
    id: sub.id,
    status: sub.status,
    created: sub.created,
    livemode: sub.livemode,
    customerId,
    customerDeleted: !customer,
    email: customer?.email ?? "",
    customerName: customer?.name ?? "",
    shipName: shipping?.name ?? "",
    phone: shipping?.phone ?? "",
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? "",
    postalCode: (address?.postal_code ?? "").trim(),
    city: address?.city ?? "",
    state: address?.state ?? "",
    country: address?.country ?? "",
  };

  return {
    ...row,
    hasAddress: Boolean(row.line1 || row.city || row.postalCode),
    postalStartsWithZero: row.postalCode.startsWith("0"),
    haystack: searchable(
      [
        row.id,
        row.customerId,
        row.email,
        row.customerName,
        row.shipName,
        row.phone,
        row.line1,
        row.line2,
        row.postalCode,
        row.city,
        row.state,
        row.country,
      ].join(" ")
    ),
  };
};

/* ------------------------------------------------------------------ */
/* Statuts                                                             */
/* ------------------------------------------------------------------ */

export const STATUS_META: Record<
  Stripe.Subscription.Status,
  { label: string; color: string; order: number }
> = {
  active: { label: "Actif", color: "green", order: 0 },
  trialing: { label: "Essai", color: "blue", order: 1 },
  past_due: { label: "Impayé (relance)", color: "yellow", order: 2 },
  unpaid: { label: "Impayé", color: "red", order: 3 },
  paused: { label: "En pause", color: "gray", order: 4 },
  incomplete: { label: "Incomplet", color: "orange", order: 5 },
  incomplete_expired: { label: "Incomplet expiré", color: "red", order: 6 },
  canceled: { label: "Annulé", color: "red", order: 7 },
};

export const ALL_STATUSES = (
  Object.keys(STATUS_META) as Stripe.Subscription.Status[]
).sort((a, b) => STATUS_META[a].order - STATUS_META[b].order);

/** Par défaut : tout sauf les annulés (même règle que l'export). */
export const DEFAULT_EXPORT_STATUSES = ALL_STATUSES.filter(
  (s) => s !== "canceled"
);

export const stripeDashboardUrl = (row: SubscriptionRow) =>
  `https://dashboard.stripe.com/${row.livemode ? "" : "test/"}subscriptions/${row.id}`;

export const formatAddressBlock = (row: SubscriptionRow) =>
  [
    row.shipName,
    row.line1,
    row.line2,
    [row.postalCode, row.city].filter(Boolean).join(" "),
    row.state,
    row.country,
  ]
    .filter(Boolean)
    .join("\n");
