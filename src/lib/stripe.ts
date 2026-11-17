import Stripe from "stripe";
import { STRIPE_API_KEY } from "../constants/stripe-api-key";

/* ------------------------------------------------------------------ */
/* Stockage de la clé (localStorage, sérialisé en JSON pour rester     */
/* compatible avec les clés déjà enregistrées via react-use)           */
/* ------------------------------------------------------------------ */

export const getStripeApiKey = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STRIPE_API_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" && parsed ? parsed : null;
  } catch {
    return null;
  }
};

export const setStripeApiKey = (key: string) => {
  localStorage.setItem(STRIPE_API_KEY, JSON.stringify(key));
};

export const clearStripeApiKey = () => {
  localStorage.removeItem(STRIPE_API_KEY);
};

/* ------------------------------------------------------------------ */
/* Détection du type de clé                                            */
/* ------------------------------------------------------------------ */

export type KeyKind = "secret" | "restricted" | "publishable" | "webhook";

export interface KeyInfo {
  kind: KeyKind | "unknown";
  mode: "live" | "test" | null;
  /** La clé peut être utilisée par l'outil (sk_ ou rk_) */
  usable: boolean;
  /** Format plausible (préfixe + longueur) */
  wellFormed: boolean;
}

/** Nettoie ce qu'on colle : espaces, retours ligne, guillemets. */
export const sanitizeKey = (raw: string) =>
  raw.trim().replace(/^["'`]+|["'`]+$/g, "").replace(/\s+/g, "");

export const detectKey = (raw: string): KeyInfo => {
  const key = sanitizeKey(raw);
  if (key.startsWith("whsec_")) {
    return { kind: "webhook", mode: null, usable: false, wellFormed: true };
  }
  const m = key.match(/^(sk|rk|pk)_(live|test)_(.*)$/);
  if (!m) {
    return { kind: "unknown", mode: null, usable: false, wellFormed: false };
  }
  const kind: KeyKind =
    m[1] === "sk" ? "secret" : m[1] === "rk" ? "restricted" : "publishable";
  const mode = m[2] as "live" | "test";
  const wellFormed = /^[A-Za-z0-9]{20,}$/.test(m[3]);
  return { kind, mode, usable: kind !== "publishable", wellFormed };
};

export const getKeyMode = () => {
  const key = getStripeApiKey();
  return key ? detectKey(key).mode : null;
};

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

const API_VERSION = "2025-12-15.clover" as const;

export const createStripeClient = (apiKey: string) =>
  new Stripe(apiKey, { apiVersion: API_VERSION });

/**
 * @throws {Error} Si la clé API n'est pas trouvée dans le localStorage
 */
export const getStripeClient = (): Stripe => {
  const apiKey = getStripeApiKey();
  if (!apiKey) {
    throw new Error(
      "Clé API Stripe non trouvée dans le localStorage. Veuillez vous connecter."
    );
  }
  return createStripeClient(apiKey);
};

/** Traduit une erreur Stripe en message lisible. */
export const describeStripeError = (err: unknown): string => {
  const e = err as { statusCode?: number; type?: string; message?: string };
  if (e?.statusCode === 401 || e?.type === "StripeAuthenticationError") {
    return "Clé refusée par Stripe : elle est invalide, expirée ou a été supprimée.";
  }
  if (e?.statusCode === 403 || e?.type === "StripePermissionError") {
    return "Cette clé restreinte n'a pas les droits nécessaires. Il faut « Lecture » sur Customers et sur Subscriptions.";
  }
  if (e?.statusCode === 429) {
    return "Trop de requêtes envoyées à Stripe, réessaie dans quelques secondes.";
  }
  if (e?.type === "StripeConnectionError") {
    return "Impossible de joindre Stripe. Vérifie ta connexion internet.";
  }
  return e?.message || "Erreur inconnue.";
};

/** Vérifie que la clé fonctionne et a bien les droits nécessaires. */
export const verifyStripeKey = async (apiKey: string) => {
  const stripe = createStripeClient(apiKey);
  await stripe.subscriptions.list({
    limit: 1,
    status: "all",
    expand: ["data.customer"],
  });
};
