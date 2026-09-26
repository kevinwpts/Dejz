import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import Stripe from 'stripe';
import { GoogleGenAI, Type } from "@google/genai";

const __dirname = path.resolve();

// Gemini lazy initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiApiKey) return null;
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (e) {
      console.error('[Gemini] Failed to initialize GoogleGenAI client:', e);
      return null;
    }
  }
  return aiClient;
}

// Lazy initialization helpers
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (error) {
    console.error("Failed to initialize Supabase Admin client:", error);
    return null;
  }
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2023-10-16' as any });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({
    verify: (req: any, res, buf) => {
      if (req.url?.includes('/webhook')) {
        req.rawBody = buf;
      }
    }
  }));

  // Request Logger
  app.use((req, res, next) => {
    if (req.url !== '/api/ping') {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    next();
  });

  // Webhook handler
  const webhookHandler = async (req: express.Request, res: express.Response) => {
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !supabaseAdmin || !sig || !webhookSecret) {
      console.error('[Webhook] Missing configuration:', { stripe: !!stripe, supabase: !!supabaseAdmin, sig: !!sig, secret: !!webhookSecret });
      return res.status(400).send('Webhook configuration missing');
    }

    let event: Stripe.Event;

    try {
      const body = (req as any).rawBody || req.body;
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`[Webhook] Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Webhook] Received event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded': {
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if ((checkoutSession.mode === 'payment' || checkoutSession.mode === 'setup' || checkoutSession.mode === 'subscription') && 
              (checkoutSession.payment_status === 'paid' || checkoutSession.payment_status === 'no_payment_required')) {
            const customerId = checkoutSession.customer as string;
            
            let userId = checkoutSession.metadata?.supabaseUUID || checkoutSession.metadata?.userId;
            
            if (!userId) {
              const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('stripe_customer_id', customerId)
                .single();
              userId = profile?.id;
            }

            if (userId) {
              console.log(`[Webhook] Updating status for user ${userId} via ${event.type}`);
              
              const isLifetime = checkoutSession.mode === 'payment' || checkoutSession.metadata?.type === 'lifetime';
              const updateData: any = {
                subscription_status: isLifetime ? 'lifetime' : 'active',
                updated_at: new Date().toISOString()
              };

              if (checkoutSession.subscription) {
                updateData.stripe_subscription_id = checkoutSession.subscription as string;
              }

              const { error } = await supabaseAdmin
                .from('profiles')
                .update(updateData)
                .eq('id', userId);
              
              if (error) console.error('[Webhook] Update error:', error);
            }
          }
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const customerId = subscription.customer as string;
          const status = subscription.cancel_at_period_end ? 'canceling' : subscription.status;
          
          // Safety check for subscription items
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const trialEnd = subscription.trial_end;
          const currentPeriodEnd = subscription.current_period_end;

          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, subscription_status')
            .eq('stripe_customer_id', customerId)
            .single();

          if (profile) {
            console.log(`[Webhook] Updating sub for user ${profile.id} to status ${status} (Price: ${priceId})`);
            const updateData: any = {
              stripe_subscription_id: subscription.id,
              subscription_status: status,
              updated_at: new Date().toISOString()
            };

            if (priceId) updateData.subscription_price_id = priceId;
            if (trialEnd) updateData.trial_end = new Date(trialEnd * 1000).toISOString();
            if (currentPeriodEnd) updateData.next_billing_date = new Date(currentPeriodEnd * 1000).toISOString();

            await supabaseAdmin
              .from('profiles')
              .update(updateData)
              .eq('id', profile.id);
          }
          break;
        }

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const piUserId = paymentIntent.metadata?.supabaseUUID || paymentIntent.metadata?.userId;
          
          if (piUserId && paymentIntent.metadata?.type === 'lifetime') {
            console.log(`[Webhook] Updating user ${piUserId} to lifetime status via payment_intent.succeeded`);
            await supabaseAdmin
              .from('profiles')
              .update({
                subscription_status: 'lifetime',
                updated_at: new Date().toISOString()
              })
              .eq('id', piUserId);
          }
          break;
        }
      }
      res.json({ received: true });
    } catch (error) {
      console.error('[Webhook] Processing failed:', error);
      res.status(500).send('Webhook processing failed');
    }
  };

  app.post('/api/stripe/webhook', webhookHandler);
  app.post('/api/stripe-webhook', webhookHandler);
  
  app.post('/api/parse-transaction', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    console.log(`[Gemini] Parsing transaction: "${text}"`);

    // Helper for local regex parsing as fallback
    const localParse = (rawText: string) => {
      const match = rawText.match(/(\d+[.,]?\d*)/);
      const amount = match ? parseFloat(match[1].replace(',', '.')) : 0;
      let name = rawText.replace(/(\d+[.,]?\d*)\s*(kr|sek)?/i, '').trim();
      if (!name) name = "Snabbköp";
      
      const lower = rawText.toLowerCase();
      let category = "Övrigt";
      if (lower.includes("kaffe") || lower.includes("lunch") || lower.includes("mat") || lower.includes("ica") || lower.includes("coop") || lower.includes("restaurang")) {
        category = "Mat";
      } else if (lower.includes("buss") || lower.includes("tåg") || lower.includes("uber") || lower.includes("bensin")) {
        category = "Transport";
      } else if (lower.includes("lön") || lower.includes("swish in") || lower.includes("inkomst")) {
        return { amount, name, type: "income", category: "Inkomst" };
      }
      return { amount, name, type: "expense", category };
    };

    const ai = getGenAI();
    if (!ai) {
      console.log('[Gemini] Using local fallback parser (no key)');
      return res.json(localParse(text));
    }

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Analysera följande ekonomiska transaktion och returnera ett JSON-objekt. 
        Inmatning: "${text}"
        
        JSON-objektet SKA ha:
        - amount: number (beloppet som en siffra, t.ex. 150 för "150kr" eller "150,50")
        - name: string (stället eller vad köpet gällde, t.ex. "ICA", "McDonalds", "Kaffe")
        - type: "income" eller "expense"
        - category: string (välj en lämplig kategori som: Mat, Transport, Shopping, Nöje, Hälsa, Bostad, Övrigt)
        
        Exempel: "ICA 150kr" -> { "amount": 150, "name": "ICA", "type": "expense", "category": "Mat" }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["income", "expense"] },
              category: { type: Type.STRING }
            },
            required: ["amount", "name", "type"]
          }
        }
      });

      const responseText = result.text?.trim() || '';
      console.log(`[Gemini] Result: "${responseText}"`);
      
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(cleanJson);
      
      if (typeof data.amount !== 'number' || isNaN(data.amount)) {
        if (typeof data.amount === 'string') {
          data.amount = parseFloat(data.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        } else {
          data.amount = 0;
        }
      }

      res.json(data);
    } catch (error) {
      console.error('[Gemini] error, falling back to local parse:', error);
      res.json(localParse(text));
    }
  });

  app.post('/api/parse-audio-expense', async (req, res) => {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'Missing audio content' });

    console.log(`[Gemini Audio] Processing audio input (mimeType: ${mimeType || 'audio/webm'})...`);

    const ai = getGenAI();
    if (!ai) {
      console.log('[Gemini Audio] Gemini client not configured');
      return res.status(500).json({ error: 'Gemini AI Client not initialized' });
    }

    try {
      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Gemini Audio] Trying model ${modelName}...`);
          const result = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: audioBase64
                }
              },
              `Lyssna mycket noga på ljudklippet. En person pratar in ett köp eller utgift/inkomst (på svenska eller engelska).
              Även om personen mumlar, pratar snabbt, otydligt eller i bakgrundsbuller: förstå vad personen köpt och för hur mycket.

              Exempel på vad personen kan säga:
              - "300 kronor på coop" -> transcript: "300 kronor på Coop", amount: 300, name: "Coop", category: "Mat", type: "expense"
              - "köpt fika för fyrtiofem spänn" -> transcript: "köpt fika för 45 spänn", amount: 45, name: "Fika", category: "Mat", type: "expense"
              - "tankat femhundra kronor circle k" -> transcript: "tankat 500 kronor Circle K", amount: 500, name: "Circle K", category: "Transport", type: "expense"
              - "swish från mikael femtiokronor" -> transcript: "swish från Mikael 50kr", amount: 50, name: "Swish Mikael", category: "Inkomst", type: "income"

              Returnera ETT JSON-objekt med:
              - transcript: string (exakt vad personen sa eller den tolkade meningen)
              - amount: number (beloppet i sifferform, t.ex. 150)
              - name: string (butik, ställe eller beskrivning av köpet)
              - category: string (lämplig kategori som: Mat, Transport, Shopping, Nöje, Hälsa, Boende, Övrigt)
              - type: "expense" eller "income"
              `
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  transcript: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["expense", "income"] }
                },
                required: ["transcript", "amount", "name", "type"]
              }
            }
          });

          const responseText = result.text?.trim() || '';
          console.log(`[Gemini Audio] Raw AI response: "${responseText}"`);
          
          const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
          const data = JSON.parse(cleanJson);

          if (typeof data.amount !== 'number' || isNaN(data.amount)) {
            if (typeof data.amount === 'string') {
              data.amount = parseFloat(data.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
            } else {
              data.amount = 0;
            }
          }

          return res.json(data);
        } catch (err: any) {
          console.warn(`[Gemini Audio] Model ${modelName} failed:`, err.message);
          lastError = err;
        }
      }

      throw lastError || new Error('Failed to parse audio with Gemini models');
    } catch (error: any) {
      console.error('[Gemini Audio] Error processing audio:', error);
      res.status(500).json({ error: error.message || 'Kunde inte tolka ljudet' });
    }
  });



  // API Health Check
  app.get("/api/ping", (req, res) => {
    res.json({ 
      status: "pong", 
      supabaseConfigured: !!getSupabaseAdmin(),
      env: process.env.NODE_ENV,
      time: new Date().toISOString()
    });
  });

  // Stripe Checkout Session
  app.post('/api/stripe/checkout', async (req, res) => {
    const { userId, email, priceId, mode } = req.body;
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    if (!stripe || !supabaseAdmin || !userId || !email || !priceId || !mode) {
      return res.status(400).json({ error: 'Missing configuration or user data' });
    }

    try {
      // Get or create customer
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      let customerId = profile?.stripe_customer_id;

      if (!customerId) {
        console.log(`Creating new Stripe customer for user ${userId}`);
        const customer = await stripe.customers.create({
          email,
          metadata: { supabaseUUID: userId },
        });
        customerId = customer.id;
        
        // Use update instead of upsert to be safer
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Failed to save stripe_customer_id via update:', updateError);
          // Fallback to upsert
          const { error: upsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({ id: userId, stripe_customer_id: customerId, email: email });
            
          if (upsertError) {
            console.error('Failed to upsert stripe_customer_id:', upsertError);
            throw new Error(`Kunde inte spara Stripe-kundinfo: ${upsertError.message}`);
          }
        }
      }

      const sessionConfig: any = {
        customer: customerId,
        metadata: { 
          userId: userId,
          supabaseUUID: userId,
          type: mode === 'payment' ? 'lifetime' : 'subscription'
        },
        automatic_payment_methods: { enabled: true },
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: mode,
        success_url: `${appUrl}/profile?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/profile`,
      };

      if (mode === 'subscription') {
        sessionConfig.subscription_data = { trial_period_days: 7 };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Create Intent (for integrated payments)
  app.post('/api/stripe/create-intent', async (req, res) => {
    const { userId, email, priceId, mode } = req.body;
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    if (!stripe || !supabaseAdmin || !userId || !email || !priceId || !mode) {
      return res.status(400).json({ error: 'Missing configuration or user data' });
    }

    try {
      // Get or create customer
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      let customerId = profile?.stripe_customer_id;

      if (!customerId) {
        console.log(`Creating new Stripe customer for user ${userId}`);
        const customer = await stripe.customers.create({
          email,
          metadata: { supabaseUUID: userId },
        });
        customerId = customer.id;
        
        // Use update instead of upsert to be safer
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Failed to save stripe_customer_id via update:', updateError);
          // Fallback to upsert
          const { error: upsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({ id: userId, stripe_customer_id: customerId, email: email });
            
          if (upsertError) {
            console.error('Failed to upsert stripe_customer_id:', upsertError);
            throw new Error(`Kunde inte spara Stripe-kundinfo: ${upsertError.message}`);
          }
        }
      }

      if (mode === 'subscription') {
        // Create the subscription
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
          trial_period_days: 7,
          metadata: { 
            userId: userId, 
            supabaseUUID: userId,
            type: 'subscription' 
          },
        });

        const invoice = subscription.latest_invoice as any;
        const paymentIntent = invoice?.payment_intent as any;
        const setupIntent = subscription.pending_setup_intent as any;

        res.json({
          subscriptionId: subscription.id,
          clientSecret: paymentIntent?.client_secret || setupIntent?.client_secret,
        });
      } else {
        // Lifetime payment (one-time)
        // We need to get the price amount first
        const price = await stripe.prices.retrieve(priceId);
        if (!price.unit_amount) throw new Error('Price amount not found');

        const paymentIntent = await stripe.paymentIntents.create({
          amount: price.unit_amount,
          currency: price.currency,
          customer: customerId,
          automatic_payment_methods: { enabled: true },
          metadata: { 
            userId: userId, 
            supabaseUUID: userId,
            type: 'lifetime' 
          },
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
        });
      }
    } catch (error: any) {
      console.error('Create intent error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Verify Payment (Fallback for when webhook is not configured or slow)
  app.post('/api/stripe/verify', async (req, res) => {
    const { userId } = req.body || {};
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    console.log(`[Verify] POST /api/stripe/verify hit for user: ${userId}`);

    if (!stripe || !supabaseAdmin || !userId) {
      console.error(`[Verify] Missing config: stripe=${!!stripe}, supabase=${!!supabaseAdmin}, userId=${userId}`);
      return res.status(400).json({ error: 'Missing configuration or user data' });
    }

    try {
      res.setHeader('Content-Type', 'application/json');
      console.log(`[Verify] Starting verification for user ${userId}`);
      
      // Get customer ID
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

      // Try a few times with small delays if nothing is found immediately
      // to handle race conditions with Stripe status updates
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
          
          // If incomplete, check if payment actually succeeded or is processing
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
            
          return res.json({ success: true, status: effectiveStatus });
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
            
          return res.json({ success: true, status: effectiveStatus });
        }
      }

      console.log(`[Verify] No active subscription or payment found for user ${userId} after retries`);
      res.json({ success: false, status: 'none' });
    } catch (error: any) {
      console.error('[Verify] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Billing Portal
  app.post('/api/stripe/portal', async (req, res) => {
    const { userId } = req.body;
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    if (!stripe || !supabaseAdmin || !userId) {
      return res.status(400).json({ error: 'Missing configuration or user data' });
    }

    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      if (!profile?.stripe_customer_id) {
        return res.status(400).json({ error: 'No Stripe customer found' });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${appUrl}/profile`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Portal error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Cancel Subscription
  app.post('/api/stripe/cancel-subscription', async (req, res) => {
    const { userId } = req.body;
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    if (!stripe || !supabaseAdmin || !userId) {
      return res.status(400).json({ error: 'Missing configuration or user data' });
    }

    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_subscription_id')
        .eq('id', userId)
        .single();

      if (!profile?.stripe_subscription_id) {
        return res.status(400).json({ error: 'Ingen aktiv prenumeration hittades' });
      }

      // Cancel at the end of the period
      const subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      // Update database status
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'canceling', // Custom status to show it's active until end of period
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      res.json({ success: true, subscription });
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Subscription Details for In-App Display
  app.get('/api/stripe/subscription-details/:userId', async (req, res) => {
    const { userId } = req.params;
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    if (!stripe || !supabaseAdmin || !userId) {
      return res.status(400).json({ error: 'Missing configuration or user data' });
    }

    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('id', userId)
        .single();

      if (!profile?.stripe_customer_id) {
        return res.json({ active: false });
      }

      const customer = await stripe.customers.retrieve(profile.stripe_customer_id, {
        expand: ['subscriptions', 'default_payment_method']
      }) as any;

      const subscription = customer.subscriptions?.data[0];
      const paymentMethod = customer.default_payment_method as any;

      if (!subscription) {
        return res.json({ active: false });
      }

      res.json({
        active: true,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        amount: subscription.items.data[0].plan.amount,
        currency: subscription.items.data[0].plan.currency,
        interval: subscription.items.data[0].plan.interval,
        cardBrand: paymentMethod?.card?.brand,
        cardLast4: paymentMethod?.card?.last4,
      });
    } catch (error: any) {
      console.error('Fetch subscription details error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Account (Full deletion including auth user)
  app.post('/api/auth/delete-account', async (req, res) => {
    const { userId } = req.body;
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin || !userId) {
      return res.status(400).json({ error: 'Missing configuration or user data' });
    }

    try {
      console.log(`Starting full account deletion for user: ${userId}`);

      // 1. Delete all user data from public tables
      // We do this first to avoid foreign key issues if any exist
      const tables = ['transactions', 'fixed_expenses', 'income_sources', 'savings_goals', 'feedback', 'profiles'];
      
      for (const table of tables) {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq(table === 'profiles' ? 'id' : 'user_id', userId);
        
        if (error) {
          console.error(`Error deleting from ${table}:`, error);
          // We continue anyway to try to delete as much as possible
        }
      }

      // 2. Delete the auth user
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError);
        return res.status(500).json({ error: 'Kunde inte radera användarkontot helt: ' + deleteAuthError.message });
      }

      console.log(`Successfully deleted account for user: ${userId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete account error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/manifest.json', (req, res) => {
    const theme = req.query.theme as string || 'emerald';
    
    const themeColors: Record<string, string> = {
      emerald: '#10b981',
      midnight: '#161616',
      sunset: '#f97316',
      ocean: '#0ea5e9',
      gold: '#eab308'
    };

    const manifest = {
      "name": "Dejz",
      "short_name": "Dejz",
      "description": "Ta kontroll över din ekonomi",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": themeColors[theme] || '#10b981',
      "icons": [
        {
          "src": `/api/icon.svg?theme=${theme}`,
          "sizes": "any",
          "type": "image/svg+xml",
          "purpose": "any maskable"
        }
      ]
    };
    res.json(manifest);
  });

  app.get('/api/icon.svg', (req, res) => {
    const theme = req.query.theme as string || 'emerald';
    const themeColors: Record<string, string> = {
      emerald: '#10b981',
      midnight: '#161616',
      sunset: '#f97316',
      ocean: '#0ea5e9',
      gold: '#eab308'
    };
    const color = themeColors[theme] || '#10b981';
    
    // Use official dejz brand favicon SVG dynamically colored
    let svg: string;
    try {
      const template = fs.readFileSync(path.resolve(process.cwd(), "public", "favicon.svg"), "utf8");
      svg = template.replace(/fill="#1A2456"/g, `fill="${color}"`);
    } catch {
      svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="128" fill="${color}"/></svg>`;
    }
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist'), {
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // Global error handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.error('Unhandled API Error:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    } else {
      next(err);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
