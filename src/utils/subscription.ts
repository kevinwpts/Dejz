export type SubscriptionStatus = 'free' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';

export function isPro(_status?: SubscriptionStatus | string | null | undefined, _trialEnd?: string | null): boolean {
  return true;
}

export async function createCheckoutSession(userId: string, email: string, priceId: string, mode: 'subscription' | 'payment') {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, priceId, mode }),
  });
  
  const data = await response.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error || 'Failed to create checkout session');
  }
}

export async function createPaymentIntent(userId: string, email: string, priceId: string, mode: 'subscription' | 'payment') {
  const response = await fetch('/api/stripe/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, priceId, mode }),
  });
  
  const data = await response.json();
  if (data.clientSecret) {
    return data;
  } else {
    throw new Error(data.error || 'Failed to create payment intent');
  }
}

export async function openBillingPortal(userId: string) {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  
  const data = await response.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error || 'Failed to open billing portal');
  }
}

export async function verifyPayment(userId: string) {
  const response = await fetch('/api/stripe/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('[Verify] Server returned non-JSON response:', {
      status: response.status,
      statusText: response.statusText,
      contentType,
      body: text.substring(0, 500)
    });
    
    if (response.status === 404) {
      throw new Error('Verifieringstjänsten hittades inte (404). Kontrollera att servern körs korrekt.');
    }
    
    throw new Error(`Servern svarade med ett ogiltigt format (${response.status}). Kontrollera serverloggarna.`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function getSubscriptionDetails(userId: string) {
  const response = await fetch(`/api/stripe/subscription-details/${userId}`);
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function cancelSubscription(userId: string) {
  const response = await fetch('/api/stripe/cancel-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}
