import Stripe from "stripe";
import { STRIPE_API_KEY } from "../constants/stripe-api-key";

/**
 * Récupère la clé API Stripe depuis le localStorage
 */
export const getStripeApiKey = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const apiKey = localStorage.getItem(STRIPE_API_KEY);
  if (!apiKey) {
    return null;
  }
  return JSON.parse(apiKey);
};

/**
 * Initialise et retourne un client Stripe configuré avec la clé API du localStorage
 * @throws {Error} Si la clé API n'est pas trouvée dans le localStorage
 */
export const getStripeClient = (): Stripe => {
  const apiKey = getStripeApiKey();
  if (!apiKey) {
    throw new Error(
      "Clé API Stripe non trouvée dans le localStorage. Veuillez vous connecter."
    );
  }

  return new Stripe(apiKey, {
    apiVersion: "2025-12-15.clover",
  });
};
