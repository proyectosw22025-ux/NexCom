import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Toggle único del modo de pago con tarjeta:
 * - Con NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY definida → Stripe REAL (Elements +
 *   PaymentIntent + webhook). La tarjeta la procesa Stripe, nunca el backend.
 * - Sin la clave → modo DEMO (formulario cosmético, sin cobro real).
 */
export const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
export const stripeHabilitado = STRIPE_PK.startsWith("pk_");

let stripePromise: Promise<Stripe | null> | null = null;

/** Carga perezosa y única del SDK de Stripe (solo si está habilitado). */
export function getStripe() {
  if (!stripeHabilitado) return null;
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PK);
  return stripePromise;
}
