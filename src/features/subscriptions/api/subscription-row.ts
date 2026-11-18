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

/* ------------------------------------------------------------------ */
/* Filtres de statut (sélecteur tableau + export)                      */
/* Les annulés sont scindés en "avec adresse" / "sans adresse".        */
/* ------------------------------------------------------------------ */

export type StatusFilter =
  | Exclude<Stripe.Subscription.Status, "canceled">
  | "canceled_with_address"
  | "canceled_no_address";

export const statusFilterOf = (row: SubscriptionRow): StatusFilter =>
  row.status === "canceled"
    ? row.hasAddress
      ? "canceled_with_address"
      : "canceled_no_address"
    : row.status;

export const STATUS_FILTER_META: Record<
  StatusFilter,
  { label: string; color: string; order: number }
> = {
  active: STATUS_META.active,
  trialing: STATUS_META.trialing,
  past_due: STATUS_META.past_due,
  unpaid: STATUS_META.unpaid,
  paused: STATUS_META.paused,
  incomplete: STATUS_META.incomplete,
  incomplete_expired: STATUS_META.incomplete_expired,
  canceled_with_address: { label: "Annulé avec adresse", color: "red", order: 7 },
  canceled_no_address: { label: "Annulé sans adresse", color: "red", order: 8 },
};

export const ALL_STATUS_FILTERS = (
  Object.keys(STATUS_FILTER_META) as StatusFilter[]
).sort((a, b) => STATUS_FILTER_META[a].order - STATUS_FILTER_META[b].order);

export const isCanceledFilter = (s: StatusFilter) =>
  s === "canceled_with_address" || s === "canceled_no_address";

/** Par défaut : tout sauf les annulés (même règle que l'export). */
export const DEFAULT_STATUS_FILTERS = ALL_STATUS_FILTERS.filter(
  (s) => !isCanceledFilter(s)
);

export const countByStatusFilter = (rows: SubscriptionRow[]) => {
  const counts = new Map<StatusFilter, number>();
  for (const r of rows) {
    const k = statusFilterOf(r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
};

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
