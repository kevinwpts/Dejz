import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { userId } = body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in request body' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeKey || !supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing configuration' });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });
    const supabaseAdmin = createClient(supabaseUrl as string, supabaseKey);

    console.log(`[Verify] Starting verification for user ${userId}`);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      console.error(`[Verify] Profile error or customer missing for ${userId}:`, profileError);
      return res.status(404).json({ error: 'Hittade inte din profil eller Stripe-kund. Har du börjat ett köp?' });
    }

    const customerId = profile.stripe_customer_id;
    console.log(`[Verify] Checking Stripe for customer ${customerId} (Current DB status: ${profile.subscription_status})`);

    for (let attempt = 0; attempt < 8; attempt++) {
      if (attempt > 0) {
        console.log(`[Verify] Retry attempt ${attempt} for user ${userId}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // 1. Check for ANY subscription status that counts as active
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 5,
        expand: ['data.latest_invoice.payment_intent']
      });

      console.log(`[Verify] Found ${subscriptions.data.length} subscriptions for customer ${customerId}`);

      const activeSub = subscriptions.data.find(sub => 
        ['active', 'trialing', 'past_due', 'incomplete'].includes(sub.status)
      ) as any;

      if (activeSub) {
        console.log(`[Verify] Found sub: ${activeSub.id} (status: ${activeSub.status})`);
        let effectiveStatus: string = activeSub.status;
        
        if (activeSub.status === 'incomplete' || activeSub.status === 'past_due') {
          try {
            const subWithDetails = await stripe.subscriptions.retrieve(activeSub.id, {
              expand: ['pending_setup_intent', 'latest_invoice.payment_intent']
            });
            const setupIntent = subWithDetails.pending_setup_intent as any;
            const paymentIntent = (subWithDetails.latest_invoice as any)?.payment_intent as any;
            
            const isPaid = (setupIntent && (setupIntent.status === 'succeeded' || setupIntent.status === 'processing')) || 
                          (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) ||
                          ((subWithDetails.latest_invoice as any)?.status === 'paid');
            
            if (isPaid) {
              console.log(`[Verify] Sub ${activeSub.id} has successful payment/setup intent or paid invoice`);
              effectiveStatus = activeSub.trial_end ? 'trialing' : 'active';
            } else if (activeSub.status === 'incomplete') {
              console.log(`[Verify] Sub ${activeSub.id} still waiting for payment confirmation`);
              continue; 
            }
          } catch (subError) {
            console.error(`[Verify] Error retrieving sub details for ${activeSub.id}:`, subError);
            continue;
          }
        }

        if (activeSub.cancel_at_period_end) {
          effectiveStatus = 'canceling';
        }

        console.log(`[Verify] Updating user ${userId} to status: ${effectiveStatus}`);
        
        const trialEndDate = activeSub.trial_end ? new Date(activeSub.trial_end * 1000) : null;
        const billingDate = activeSub.current_period_end ? new Date(activeSub.current_period_end * 1000) : null;

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            stripe_subscription_id: activeSub.id,
            subscription_status: effectiveStatus as any,
            subscription_price_id: activeSub.items.data[0].price.id,
            trial_end: trialEndDate && !isNaN(trialEndDate.getTime()) ? trialEndDate.toISOString() : null,
            next_billing_date: billingDate && !isNaN(billingDate.getTime()) ? billingDate.toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
          
        if (updateError) {
          console.error(`[Verify] Failed to update DB for user ${userId}:`, updateError);
          throw updateError;
        }
          
        return res.status(200).json({ success: true, status: effectiveStatus });
      }

      // 2. Check for lifetime payments (PaymentIntents)
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 15,
      });

      const lifetimeIntent = paymentIntents.data.find(
        (pi) => (pi.status === 'succeeded' || pi.status === 'processing') && 
                (pi.metadata.type === 'lifetime' || pi.metadata.userId === userId || pi.metadata.supabaseUUID === userId)
      );

      if (lifetimeIntent) {
        console.log(`[Verify] Found lifetime intent: ${lifetimeIntent.id} (status: ${lifetimeIntent.status})`);
        const effectiveStatus = lifetimeIntent.status === 'succeeded' ? 'lifetime' : 'trialing';
        
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: effectiveStatus as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error(`[Verify] Failed to update DB for user ${userId}:`, updateError);
          throw updateError;
        }
          
        return res.status(200).json({ success: true, status: effectiveStatus });
      }
    }

    console.log(`[Verify] No active subscription or payment found for user ${userId} after retries`);
    return res.status(200).json({ success: false, status: 'none' });
  } catch (error: any) {
    console.error('[Verify] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
