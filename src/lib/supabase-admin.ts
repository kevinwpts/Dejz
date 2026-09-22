import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function updateSubscriptionStatus(
  stripeCustomerId: string,
  subscriptionId: string,
  status: string,
  priceId: string,
  trialEnd?: number
) {
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();

  if (fetchError || !profile) {
    console.error('Profile not found for customer:', stripeCustomerId);
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      subscription_price_id: priceId,
      trial_end: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error('Error updating subscription status:', updateError);
  }
}

export async function getOrCreateStripeCustomer(userId: string, email: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new customer in Stripe
  const { stripe } = await import('./stripe');
  const customer = await stripe.customers.create({
    email,
    metadata: { supabaseUUID: userId },
  });

  await supabaseAdmin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}
