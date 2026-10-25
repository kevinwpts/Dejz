import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ENABLE_BANKING_BASE_URL = "https://api.enablebanking.com";
const DEFAULT_REDIRECT_URL = "https://dejz.se/bank/callback";

const ADMIN_EMAILS = new Set([
  "kevinwpts@gmail.com",
  "hej@dejz.se",
]);

// ISO 20022 / Enable Banking balance type labels in Swedish
const BALANCE_TYPE_LABELS: Record<string, string> = {
  CLAV: "Disponibelt saldo (CLAV)",
  ITAV: "Tillgängligt saldo (ITAV)",
  ITBD: "Bokfört saldo (ITBD)",
  CLBD: "Utgående bokfört saldo (CLBD)",
  XPCD: "Förväntat saldo (XPCD)",
  OPAV: "Ingående disponibelt saldo (OPAV)",
  OPBD: "Ingående bokfört saldo (OPBD)",
  PRCD: "Tidigare bokfört saldo (PRCD)",
  FWAV: "Framtida disponibelt saldo (FWAV)",
  INFO: "Informationssaldo (INFO)",
  VALU: "Valuterat saldo (VALU)",
  OTHR: "Övrigt saldo (OTHR)",
};

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(str: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(str));
}

/**
 * Wraps a PKCS#1 RSAPrivateKey DER buffer into a PKCS#8 PrivateKeyInfo DER buffer
 * so Web Crypto API (crypto.subtle.importKey("pkcs8", ...)) can import both
 * "BEGIN PRIVATE KEY" and "BEGIN RSA PRIVATE KEY" keys seamlessly.
 */
function wrapPkcs1ToPkcs8(pkcs1Der: Uint8Array): Uint8Array {
  // RSA OID: 1.2.840.113549.1.1.1 with NULL parameters
  const rsaAlgorithmIdentifier = new Uint8Array([
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00,
  ]);
  const version = new Uint8Array([0x02, 0x01, 0x00]);

  function encodeAsn1Length(len: number): Uint8Array {
    if (len < 128) return new Uint8Array([len]);
    const bytes: number[] = [];
    let temp = len;
    while (temp > 0) {
      bytes.unshift(temp & 0xff);
      temp >>= 8;
    }
    return new Uint8Array([0x80 | bytes.length, ...bytes]);
  }

  const octetStringHeader = new Uint8Array([0x04, ...encodeAsn1Length(pkcs1Der.length)]);
  const bodyLength =
    version.length +
    rsaAlgorithmIdentifier.length +
    octetStringHeader.length +
    pkcs1Der.length;
  const seqHeader = new Uint8Array([0x30, ...encodeAsn1Length(bodyLength)]);

  const pkcs8 = new Uint8Array(seqHeader.length + bodyLength);
  let offset = 0;
  pkcs8.set(seqHeader, offset);
  offset += seqHeader.length;
  pkcs8.set(version, offset);
  offset += version.length;
  pkcs8.set(rsaAlgorithmIdentifier, offset);
  offset += rsaAlgorithmIdentifier.length;
  pkcs8.set(octetStringHeader, offset);
  offset += octetStringHeader.length;
  pkcs8.set(pkcs1Der, offset);

  return pkcs8;
}

async function importPrivateKey(pemRaw: string): Promise<CryptoKey> {
  // Normalize escaped newlines if stored as single-line secret
  const normalizedPem = pemRaw.replace(/\\n/g, "\n").trim();
  const isPkcs1 = normalizedPem.includes("BEGIN RSA PRIVATE KEY");

  const base64Body = normalizedPem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, "")
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const binaryDer = atob(base64Body);
  const derBytes = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    derBytes[i] = binaryDer.charCodeAt(i);
  }

  const pkcs8Bytes = isPkcs1 ? wrapPkcs1ToPkcs8(derBytes) : derBytes;

  return await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Bytes.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
}

async function createEnableBankingJwt(environment: "production" | "sandbox"): Promise<string> {
  const appId =
    environment === "sandbox"
      ? Deno.env.get("ENABLE_BANKING_SANDBOX_APP_ID")
      : Deno.env.get("ENABLE_BANKING_APP_ID");
  const privateKeyPem =
    environment === "sandbox"
      ? Deno.env.get("ENABLE_BANKING_SANDBOX_PRIVATE_KEY")
      : Deno.env.get("ENABLE_BANKING_PRIVATE_KEY");

  if (!appId || !privateKeyPem) {
    const missingEnvLabel =
      environment === "sandbox"
        ? "ENABLE_BANKING_SANDBOX_APP_ID / ENABLE_BANKING_SANDBOX_PRIVATE_KEY"
        : "ENABLE_BANKING_APP_ID / ENABLE_BANKING_PRIVATE_KEY";
    throw new Error(`Saknar serverhemligheter i Supabase för Enable Banking (${missingEnvLabel}).`);
  }

  const now = Math.floor(Date.now() / 1000);
  const header = {
    typ: "JWT",
    alg: "RS256",
    kid: appId.trim(),
  };
  const payload = {
    iss: "enablebanking.com",
    aud: "api.enablebanking.com",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncodeString(JSON.stringify(header));
  const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const cryptoKey = await importPrivateKey(privateKeyPem);
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const encodedSignature = base64UrlEncodeBytes(new Uint8Array(signatureBuffer));
  return `${signingInput}.${encodedSignature}`;
}

async function enableBankingRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    environment: "production" | "sandbox";
    psuIpAddress?: string | null;
    psuUserAgent?: string | null;
  },
) {
  const jwt = await createEnableBankingJwt(options.environment);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.psuIpAddress) {
    headers["Psu-Ip-Address"] = options.psuIpAddress;
  }
  if (options.psuUserAgent) {
    headers["Psu-User-Agent"] = options.psuUserAgent;
  }

  const url = `${ENABLE_BANKING_BASE_URL}${path}`;
  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const detail = data?.message || data?.detail || data?.error_description || data?.error || text || `HTTP ${response.status}`;
    const err: any = new Error(`Enable Banking API-fel (${response.status}): ${detail}`);
    err.status = response.status;
    err.apiError = data;
    throw err;
  }

  return data;
}

function selectPreferredBalance(balances: any[]): {
  amount: number | null;
  currency: string;
  balanceType: string | null;
  balanceLabel: string | null;
} {
  if (!Array.isArray(balances) || balances.length === 0) {
    return {
      amount: null,
      currency: "SEK",
      balanceType: null,
      balanceLabel: null,
    };
  }

  // Priority order for displaying main balance while keeping exact bank label
  const priorityOrder = ["CLAV", "ITAV", "ITBD", "CLBD", "XPCD", "OPAV", "OPBD", "PRCD", "VALU", "INFO"];
  let chosen = balances[0];

  for (const code of priorityOrder) {
    const found = balances.find((b) => b?.balance_type === code);
    if (found && found?.balance_amount?.amount !== undefined) {
      chosen = found;
      break;
    }
  }

  const rawAmount = chosen?.balance_amount?.amount;
  const parsedAmount = rawAmount !== undefined && rawAmount !== null ? Number(rawAmount) : null;
  const currency = chosen?.balance_amount?.currency || "SEK";
  const balanceType = chosen?.balance_type || null;
  const bankProvidedName = typeof chosen?.name === "string" && chosen.name.trim().length > 0
    ? chosen.name.trim()
    : null;

  const mappedLabel = balanceType ? (BALANCE_TYPE_LABELS[balanceType] || `Saldo (${balanceType})`) : "Saldo";
  const balanceLabel = bankProvidedName && balanceType
    ? `${bankProvidedName} (${balanceType})`
    : bankProvidedName || mappedLabel;

  return {
    amount: Number.isFinite(parsedAmount) ? parsedAmount : null,
    currency,
    balanceType,
    balanceLabel,
  };
}

function extractCounterpartyAndDescription(tx: any): {
  description: string;
  counterpartyName: string | null;
  amount: number;
  currency: string;
  creditDebitIndicator: string | null;
  externalKey: string;
  bookingDate: string | null;
  valueDate: string | null;
  transactionDate: string | null;
  bookingStatus: "BOOK" | "PDNG" | "HOLD" | "OTHR";
} {
  const rawStatus = String(tx?.status || "BOOK").toUpperCase();
  const bookingStatus: "BOOK" | "PDNG" | "HOLD" | "OTHR" =
    rawStatus === "BOOK" || rawStatus === "PDNG" || rawStatus === "HOLD" ? rawStatus : "OTHR";

  const rawAmountStr = tx?.transaction_amount?.amount ?? tx?.amount ?? "0";
  let numericAmount = Number(rawAmountStr);
  if (!Number.isFinite(numericAmount)) numericAmount = 0;

  const indicator = tx?.credit_debit_indicator ? String(tx.credit_debit_indicator).toUpperCase() : null;
  // Normalize signed amount: DBIT is negative outflow, CRDT is positive inflow
  if (indicator === "DBIT" && numericAmount > 0) {
    numericAmount = -numericAmount;
  } else if (indicator === "CRDT" && numericAmount < 0) {
    numericAmount = Math.abs(numericAmount);
  }

  const currency = tx?.transaction_amount?.currency || tx?.currency || "SEK";

  const creditorName = tx?.creditor?.name || tx?.creditor_name || null;
  const debtorName = tx?.debtor?.name || tx?.debtor_name || null;
  const counterpartyName =
    indicator === "DBIT"
      ? creditorName || debtorName
      : debtorName || creditorName;

  let remittance = "";
  if (Array.isArray(tx?.remittance_information)) {
    remittance = tx.remittance_information.filter(Boolean).join(" ").trim();
  } else if (typeof tx?.remittance_information === "string") {
    remittance = tx.remittance_information.trim();
  } else if (typeof tx?.remittance_information_unstructured === "string") {
    remittance = tx.remittance_information_unstructured.trim();
  }

  const description =
    remittance ||
    counterpartyName ||
    tx?.additional_information ||
    tx?.bank_transaction_code?.description ||
    "Banktransaktion";

  const bookingDate = tx?.booking_date || null;
  const valueDate = tx?.value_date || null;
  const transactionDate = tx?.transaction_date || bookingDate || valueDate || null;

  // Build a deterministic unique key to avoid duplicates across refreshes and status changes
  const rawId =
    tx?.entry_reference ||
    tx?.transaction_id ||
    tx?.internal_transaction_id ||
    null;

  const externalKey = rawId
    ? `${rawId}_${bookingStatus}`
    : `${bookingStatus}_${bookingDate || transactionDate || "nodate"}_${numericAmount.toFixed(2)}_${currency}_${description.slice(0, 64)}`;

  return {
    description,
    counterpartyName,
    amount: numericAmount,
    currency,
    creditDebitIndicator: indicator,
    externalKey,
    bookingDate,
    valueDate,
    transactionDate,
    bookingStatus,
  };
}

function extractClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Supabase-miljövariabler saknas i Edge Function.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autentisering saknas. Logga in på nytt." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify user via Supabase Auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Din inloggningssession har gått ut. Logga in igen för att fortsätta." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Service role client for server-only tables (bank_provider_sessions, state validation, upserts)
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Feature flag / Restricted mode enforcement:
    // Only allow admin user unless ENABLE_BANKING_ALLOW_ALL_USERS === "true"
    const allowAllUsers = Deno.env.get("ENABLE_BANKING_ALLOW_ALL_USERS") === "true";
    const userEmail = (user.email || "").toLowerCase();
    let isAuthorizedUser = allowAllUsers || ADMIN_EMAILS.has(userEmail);

    if (!isAuthorizedUser) {
      const { data: profileData } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileData?.role === "admin") {
        isAuthorizedUser = true;
      }
    }

    if (!isAuthorizedUser) {
      return new Response(
        JSON.stringify({
          error: "Bankkoppling är för närvarande i begränsat läge (Restricted) och endast tillgänglig för administratörskontot.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;
    const requestedEnv = body?.environment === "sandbox" ? "sandbox" : "production";
    const psuIpAddress = extractClientIp(req);
    const psuUserAgent = req.headers.get("user-agent");

    // -------------------------------------------------------------------------
    // ACTION: list-aspsps (Fetch available banks in country, default SE)
    // -------------------------------------------------------------------------
    if (action === "list-aspsps") {
      const country = typeof body?.country === "string" && body.country.length === 2
        ? body.country.toUpperCase()
        : "SE";

      const data = await enableBankingRequest(`/aspsps?country=${encodeURIComponent(country)}`, {
        method: "GET",
        environment: requestedEnv,
        psuIpAddress,
        psuUserAgent,
      });

      const aspspsRaw = Array.isArray(data?.aspsps) ? data.aspsps : [];
      // Sort with SEB and major Swedish banks at the top
      const priorityBanks = ["SEB", "Swedbank", "Handelsbanken", "Nordea", "Länsförsäkringar", "Danske Bank", "Skandia", "ICA Banken", "Avanza", "Nordnet"];
      const aspsps = aspspsRaw
        .map((bank: any) => ({
          name: bank.name,
          country: bank.country || country,
          logo: bank.logo || null,
          bic: bank.bic || null,
          maximumConsentValidity: bank.maximum_consent_validity || 90 * 86400,
        }))
        .sort((a: any, b: any) => {
          const idxA = priorityBanks.findIndex((p) => a.name.toLowerCase().includes(p.toLowerCase()));
          const idxB = priorityBanks.findIndex((p) => b.name.toLowerCase().includes(p.toLowerCase()));
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.name.localeCompare(b.name, "sv");
        });

      return new Response(
        JSON.stringify({ aspsps, environment: requestedEnv }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: start-auth (Create single-use state and initiate POST /auth)
    // -------------------------------------------------------------------------
    if (action === "start-auth") {
      const aspspName = String(body?.aspspName || "").trim();
      const aspspCountry = String(body?.aspspCountry || "SE").trim().toUpperCase();
      const aspspLogo = body?.aspspLogo ? String(body.aspspLogo) : null;
      const originContext = body?.originContext === "onboarding" ? "onboarding" : "settings";
      const returnStep = body?.returnStep ? String(body.returnStep) : null;
      const reconnectConnectionId = body?.reconnectConnectionId ? String(body.reconnectConnectionId) : null;

      if (!aspspName) {
        return new Response(
          JSON.stringify({ error: "Välj en bank för att starta anslutningen." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Generate cryptographically random single-use state token
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const stateToken = base64UrlEncodeBytes(randomBytes);

      const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString(); // 20 minutes validity
      const validUntilDate = new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString(); // 89 days consent validity

      const { error: stateInsertError } = await adminClient
        .from("bank_auth_states")
        .insert({
          user_id: user.id,
          state_token: stateToken,
          aspsp_name: aspspName,
          aspsp_country: aspspCountry,
          aspsp_logo: aspspLogo,
          origin_context: originContext,
          return_step: returnStep,
          environment: requestedEnv,
          connection_id: reconnectConnectionId,
          expires_at: expiresAt,
        });

      if (stateInsertError) {
        throw new Error(`Kunde inte spara säkerhetstillstånd (state): ${stateInsertError.message}`);
      }

      const configuredRedirectUrl =
        Deno.env.get("ENABLE_BANKING_REDIRECT_URL")?.trim() || DEFAULT_REDIRECT_URL;
      const requestedRedirectUrl = typeof body?.redirectUrl === "string"
        ? body.redirectUrl.trim()
        : "";
      const isValidRequestedRedirect =
        requestedRedirectUrl.startsWith("https://") &&
        requestedRedirectUrl.endsWith("/bank/callback");

      let redirectUrlUsed = isValidRequestedRedirect
        ? requestedRedirectUrl
        : configuredRedirectUrl;

      const buildAuthPayload = (targetRedirectUrl: string) => ({
        access: {
          valid_until: validUntilDate,
        },
        aspsp: {
          name: aspspName,
          country: aspspCountry,
        },
        state: stateToken,
        redirect_url: targetRedirectUrl,
        psu_type: "personal",
        language: "sv",
      });

      let authResponse: any;
      try {
        authResponse = await enableBankingRequest("/auth", {
          method: "POST",
          body: buildAuthPayload(redirectUrlUsed),
          environment: requestedEnv,
          psuIpAddress,
          psuUserAgent,
        });
      } catch (firstErr: any) {
        // If the current preview origin is not yet registered in Enable Banking's Redirect URLs,
        // fall back seamlessly to the configured production redirect URL (https://dejz.se/bank/callback).
        if (redirectUrlUsed !== configuredRedirectUrl) {
          redirectUrlUsed = configuredRedirectUrl;
          authResponse = await enableBankingRequest("/auth", {
            method: "POST",
            body: buildAuthPayload(redirectUrlUsed),
            environment: requestedEnv,
            psuIpAddress,
            psuUserAgent,
          });
        } else {
          throw firstErr;
        }
      }

      if (!authResponse?.url) {
        throw new Error("Enable Banking returnerade ingen autentiserings-URL.");
      }

      return new Response(
        JSON.stringify({
          url: authResponse.url,
          state: stateToken,
          originContext,
          returnStep,
          redirectUrlUsed,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: exchange-code (Validate state, handle callback reload idempotently, create session)
    // -------------------------------------------------------------------------
    if (action === "exchange-code") {
      const code = String(body?.code || "").trim();
      const stateToken = String(body?.state || "").trim();

      if (!code || !stateToken) {
        return new Response(
          JSON.stringify({ error: "Saknar auktoriseringskod eller state-parameter från banken." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Lookup state record
      const { data: stateRecord, error: stateLookupError } = await adminClient
        .from("bank_auth_states")
        .select("*")
        .eq("state_token", stateToken)
        .maybeSingle();

      if (stateLookupError || !stateRecord) {
        return new Response(
          JSON.stringify({ error: "Ogiltig eller okänd state-parameter. Anslutningen kunde inte verifieras." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Verify state belongs to the authenticated user
      if (stateRecord.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Denna bankanslutning startades av ett annat användarkonto." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Idempotent handling: If this callback was already processed (e.g. mobile browser reload),
      // return the existing connection & its accounts without creating a duplicate connection.
      if (stateRecord.used_at && stateRecord.connection_id) {
        const { data: existingConnection } = await adminClient
          .from("bank_connections")
          .select("*")
          .eq("id", stateRecord.connection_id)
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: existingAccounts } = await adminClient
          .from("bank_accounts")
          .select("*")
          .eq("connection_id", stateRecord.connection_id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (existingConnection) {
          return new Response(
            JSON.stringify({
              alreadyProcessed: true,
              connection: existingConnection,
              accounts: existingAccounts || [],
              originContext: stateRecord.origin_context,
              returnStep: stateRecord.return_step,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      if (stateRecord.used_at) {
        return new Response(
          JSON.stringify({ error: "Denna engångslänk (state) har redan förbrukats. Starta en ny bankanslutning." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (new Date(stateRecord.expires_at).getTime() < Date.now()) {
        return new Response(
          JSON.stringify({ error: "Tidsgränsen för bankanslutningen har gått ut (20 min). Försök igen." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Mark state as used immediately before calling Enable Banking
      const usedTimestamp = new Date().toISOString();
      await adminClient
        .from("bank_auth_states")
        .update({ used_at: usedTimestamp })
        .eq("id", stateRecord.id);

      const envToUse: "production" | "sandbox" =
        stateRecord.environment === "sandbox" ? "sandbox" : "production";

      // Exchange code for session at Enable Banking
      const sessionData = await enableBankingRequest("/sessions", {
        method: "POST",
        body: { code },
        environment: envToUse,
        psuIpAddress,
        psuUserAgent,
      });

      const providerSessionId = sessionData?.session_id;
      if (!providerSessionId) {
        throw new Error("Enable Banking returnerade inget session_id.");
      }

      const validUntil =
        sessionData?.access?.valid_until ||
        new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString();

      // Determine if we are renewing an existing connection for the same bank or creating a new one
      let connectionId: string | null = stateRecord.connection_id || null;

      if (!connectionId) {
        const { data: existingSameBank } = await adminClient
          .from("bank_connections")
          .select("id")
          .eq("user_id", user.id)
          .eq("aspsp_name", stateRecord.aspsp_name)
          .eq("aspsp_country", stateRecord.aspsp_country)
          .eq("environment", envToUse)
          .neq("status", "revoked")
          .maybeSingle();

        if (existingSameBank?.id) {
          connectionId = existingSameBank.id;
        }
      }

      if (connectionId) {
        // If renewing an existing connection, revoke old provider session if different
        const { data: oldSession } = await adminClient
          .from("bank_provider_sessions")
          .select("provider_session_id")
          .eq("connection_id", connectionId)
          .maybeSingle();

        if (oldSession?.provider_session_id && oldSession.provider_session_id !== providerSessionId) {
          try {
            await enableBankingRequest(`/sessions/${encodeURIComponent(oldSession.provider_session_id)}`, {
              method: "DELETE",
              environment: envToUse,
              psuIpAddress,
              psuUserAgent,
            });
          } catch {
            // Ignore errors when revoking superseded session
          }
        }

        const { error: updateConnErr } = await adminClient
          .from("bank_connections")
          .update({
            status: "active",
            valid_until: validUntil,
            aspsp_logo: stateRecord.aspsp_logo,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connectionId)
          .eq("user_id", user.id);

        if (updateConnErr) {
          throw new Error(`Kunde inte uppdatera bankanslutning: ${updateConnErr.message}`);
        }
      } else {
        const { data: insertedConn, error: insertConnErr } = await adminClient
          .from("bank_connections")
          .insert({
            user_id: user.id,
            aspsp_name: stateRecord.aspsp_name,
            aspsp_country: stateRecord.aspsp_country,
            aspsp_logo: stateRecord.aspsp_logo,
            environment: envToUse,
            status: "active",
            valid_until: validUntil,
          })
          .select("*")
          .single();

        if (insertConnErr || !insertedConn) {
          throw new Error(`Kunde inte skapa bankanslutning: ${insertConnErr?.message}`);
        }
        connectionId = insertedConn.id;
      }

      // Store provider_session_id strictly in server-only table (never returned to client)
      await adminClient
        .from("bank_provider_sessions")
        .upsert(
          {
            connection_id: connectionId,
            user_id: user.id,
            provider_session_id: providerSessionId,
            raw_access_meta: sessionData?.access || {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "connection_id" },
        );

      // Link stateRecord to connection_id so any page reload on /bank/callback is idempotent
      await adminClient
        .from("bank_auth_states")
        .update({ connection_id: connectionId })
        .eq("id", stateRecord.id);

      // Upsert accounts returned by the bank
      const rawAccounts = Array.isArray(sessionData?.accounts) ? sessionData.accounts : [];
      const upsertedAccounts: any[] = [];

      for (const acc of rawAccounts) {
        const uid = acc?.uid || acc?.account_id?.iban || acc?.resource_id;
        if (!uid) continue;

        const iban = acc?.account_id?.iban || null;
        const bban =
          acc?.account_id?.bban ||
          acc?.account_id?.other?.identification ||
          (Array.isArray(acc?.all_account_ids) && acc.all_account_ids[0]?.identification) ||
          null;
        const name = acc?.name || acc?.product || acc?.details || stateRecord.aspsp_name;
        const product = acc?.product || acc?.cash_account_type || null;
        const currency = acc?.currency || "SEK";

        // Fetch initial balance for each available account so user can see it when choosing accounts
        let balanceInfo = {
          amount: null as number | null,
          currency,
          balanceType: null as string | null,
          balanceLabel: null as string | null,
        };
        let rawBalances: any[] = [];

        try {
          const balRes = await enableBankingRequest(`/accounts/${encodeURIComponent(uid)}/balances`, {
            method: "GET",
            environment: envToUse,
            psuIpAddress,
            psuUserAgent,
          });
          rawBalances = Array.isArray(balRes?.balances) ? balRes.balances : [];
          balanceInfo = selectPreferredBalance(rawBalances);
        } catch {
          // If initial balance fetch fails, still save the account so the user can select it
        }

        const { data: savedAcc, error: accErr } = await adminClient
          .from("bank_accounts")
          .upsert(
            {
              connection_id: connectionId,
              user_id: user.id,
              provider_account_uid: uid,
              name,
              product,
              iban,
              bban,
              currency: balanceInfo.currency || currency,
              balance_amount: balanceInfo.amount,
              balance_currency: balanceInfo.currency || currency,
              balance_type: balanceInfo.balanceType,
              balance_label: balanceInfo.balanceLabel,
              balances_json: rawBalances,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "connection_id,provider_account_uid" },
          )
          .select("*")
          .single();

        if (!accErr && savedAcc) {
          upsertedAccounts.push(savedAcc);
        }
      }

      const { data: finalConnection } = await adminClient
        .from("bank_connections")
        .select("*")
        .eq("id", connectionId)
        .single();

      return new Response(
        JSON.stringify({
          connection: finalConnection,
          accounts: upsertedAccounts,
          originContext: stateRecord.origin_context,
          returnStep: stateRecord.return_step,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: select-accounts (Save user's chosen accounts and perform initial sync)
    // -------------------------------------------------------------------------
    if (action === "select-accounts") {
      const connectionId = String(body?.connectionId || "").trim();
      const selectedAccountIds = Array.isArray(body?.selectedAccountIds)
        ? body.selectedAccountIds.map(String)
        : [];

      if (!connectionId) {
        return new Response(
          JSON.stringify({ error: "Saknar connectionId." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Verify ownership
      const { data: conn } = await adminClient
        .from("bank_connections")
        .select("*")
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!conn) {
        return new Response(
          JSON.stringify({ error: "Bankanslutningen hittades inte." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: allAccounts } = await adminClient
        .from("bank_accounts")
        .select("*")
        .eq("connection_id", connectionId)
        .eq("user_id", user.id);

      for (const acc of allAccounts || []) {
        const isSelected = selectedAccountIds.includes(acc.id);
        await adminClient
          .from("bank_accounts")
          .update({
            is_selected: isSelected,
            updated_at: new Date().toISOString(),
          })
          .eq("id", acc.id)
          .eq("user_id", user.id);
      }

      // Sync initial transactions for the selected accounts
      const envToUse: "production" | "sandbox" =
        conn.environment === "sandbox" ? "sandbox" : "production";

      const selectedAccounts = (allAccounts || []).filter((a) => selectedAccountIds.includes(a.id));
      const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      for (const acc of selectedAccounts) {
        try {
          const txUrl = `/accounts/${encodeURIComponent(acc.provider_account_uid)}/transactions?date_from=${dateFrom}`;
          const txData = await enableBankingRequest(txUrl, {
            method: "GET",
            environment: envToUse,
            psuIpAddress,
            psuUserAgent,
          });

          const rawTxs = Array.isArray(txData?.transactions) ? txData.transactions : [];
          const nextContinuationKey = txData?.continuation_key || null;

          if (rawTxs.length > 0) {
            const rowsToUpsert = rawTxs.map((tx: any) => {
              const parsed = extractCounterpartyAndDescription(tx);
              return {
                user_id: user.id,
                connection_id: conn.id,
                bank_account_id: acc.id,
                external_key: parsed.externalKey,
                entry_reference: tx?.entry_reference || null,
                transaction_id: tx?.transaction_id || null,
                booking_status: parsed.bookingStatus,
                booking_date: parsed.bookingDate,
                value_date: parsed.valueDate,
                transaction_date: parsed.transactionDate,
                amount: parsed.amount,
                currency: parsed.currency,
                credit_debit_indicator: parsed.creditDebitIndicator,
                description: parsed.description,
                counterparty_name: parsed.counterpartyName,
                raw_json: tx,
                updated_at: new Date().toISOString(),
              };
            });

            // Deduplicate within batch by external_key
            const uniqueMap = new Map<string, any>();
            for (const row of rowsToUpsert) {
              uniqueMap.set(row.external_key, row);
            }

            await adminClient
              .from("bank_transactions")
              .upsert(Array.from(uniqueMap.values()), {
                onConflict: "bank_account_id,external_key",
              });
          }

          await adminClient
            .from("bank_accounts")
            .update({
              continuation_key: nextContinuationKey,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", acc.id);
        } catch (syncErr: any) {
          console.error("Initial transaction sync warning:", syncErr?.message || syncErr);
        }
      }

      const nowIso = new Date().toISOString();
      await adminClient
        .from("bank_connections")
        .update({ last_synced_at: nowIso, updated_at: nowIso })
        .eq("id", conn.id);

      const { data: updatedAccounts } = await adminClient
        .from("bank_accounts")
        .select("*")
        .eq("connection_id", conn.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      return new Response(
        JSON.stringify({
          success: true,
          accounts: updatedAccounts || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: status (List user's bank connections & accounts, checking consent expiration)
    // -------------------------------------------------------------------------
    if (action === "status") {
      const { data: connections, error: connErr } = await adminClient
        .from("bank_connections")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "revoked")
        .order("created_at", { ascending: false });

      if (connErr) {
        throw new Error(`Kunde inte läsa bankkopplingar: ${connErr.message}`);
      }

      // Check if any active connection has passed valid_until
      const nowMs = Date.now();
      const updatedConnections = [];
      for (const conn of connections || []) {
        if (conn.status === "active" && conn.valid_until && new Date(conn.valid_until).getTime() <= nowMs) {
          const { data: expiredConn } = await adminClient
            .from("bank_connections")
            .update({
              status: "expired",
              last_error: "Samtycket för bankåtkomst har gått ut. Förnya åtkomsten för att fortsätta hämta saldon och transaktioner.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", conn.id)
            .select("*")
            .single();
          updatedConnections.push(expiredConn || { ...conn, status: "expired" });
        } else {
          updatedConnections.push(conn);
        }
      }

      const { data: accounts, error: accErr } = await adminClient
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (accErr) {
        throw new Error(`Kunde inte läsa bankkonton: ${accErr.message}`);
      }

      return new Response(
        JSON.stringify({
          connections: updatedConnections,
          accounts: accounts || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: sync (Refresh balances & transactions for selected accounts, or load more via continuation_key)
    // -------------------------------------------------------------------------
    if (action === "sync") {
      const targetConnectionId = body?.connectionId ? String(body.connectionId) : null;
      const targetAccountId = body?.bankAccountId ? String(body.bankAccountId) : null;
      const loadMoreOnly = Boolean(body?.loadMore);

      let connQuery = adminClient
        .from("bank_connections")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "revoked");

      if (targetConnectionId) {
        connQuery = connQuery.eq("id", targetConnectionId);
      }

      const { data: connections, error: connErr } = await connQuery;
      if (connErr) {
        throw new Error(`Kunde inte hämta bankkopplingar: ${connErr.message}`);
      }

      if (!connections || connections.length === 0) {
        return new Response(
          JSON.stringify({ error: "Inga aktiva bankkopplingar hittades." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const syncErrors: string[] = [];

      for (const conn of connections) {
        if (conn.valid_until && new Date(conn.valid_until).getTime() <= Date.now()) {
          await adminClient
            .from("bank_connections")
            .update({
              status: "expired",
              last_error: "Samtycket har gått ut. Förnya åtkomsten.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", conn.id);
          syncErrors.push(`${conn.aspsp_name}: Samtycket har gått ut. Förnya åtkomsten.`);
          continue;
        }

        const envToUse: "production" | "sandbox" =
          conn.environment === "sandbox" ? "sandbox" : "production";

        let accQuery = adminClient
          .from("bank_accounts")
          .select("*")
          .eq("connection_id", conn.id)
          .eq("user_id", user.id)
          .eq("is_selected", true);

        if (targetAccountId) {
          accQuery = accQuery.eq("id", targetAccountId);
        }

        const { data: accounts } = await accQuery;

        for (const acc of accounts || []) {
          try {
            // 1. Update balances unless user only clicked "Hämta äldre transaktioner" (loadMoreOnly)
            if (!loadMoreOnly) {
              const balRes = await enableBankingRequest(
                `/accounts/${encodeURIComponent(acc.provider_account_uid)}/balances`,
                {
                  method: "GET",
                  environment: envToUse,
                  psuIpAddress,
                  psuUserAgent,
                },
              );
              const rawBalances = Array.isArray(balRes?.balances) ? balRes.balances : [];
              const preferred = selectPreferredBalance(rawBalances);

              await adminClient
                .from("bank_accounts")
                .update({
                  balance_amount: preferred.amount,
                  balance_currency: preferred.currency || acc.currency,
                  balance_type: preferred.balanceType,
                  balance_label: preferred.balanceLabel,
                  balances_json: rawBalances,
                  last_synced_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", acc.id);
            }

            // 2. Fetch transactions (either latest or next page via continuation_key)
            let txPath = `/accounts/${encodeURIComponent(acc.provider_account_uid)}/transactions`;
            if (loadMoreOnly && acc.continuation_key) {
              txPath += `?continuation_key=${encodeURIComponent(acc.continuation_key)}`;
            } else {
              const dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0];
              txPath += `?date_from=${dateFrom}`;
            }

            const txData = await enableBankingRequest(txPath, {
              method: "GET",
              environment: envToUse,
              psuIpAddress,
              psuUserAgent,
            });

            const rawTxs = Array.isArray(txData?.transactions) ? txData.transactions : [];
            const nextContinuationKey = txData?.continuation_key || null;

            if (rawTxs.length > 0) {
              const rowsToUpsert = rawTxs.map((tx: any) => {
                const parsed = extractCounterpartyAndDescription(tx);
                return {
                  user_id: user.id,
                  connection_id: conn.id,
                  bank_account_id: acc.id,
                  external_key: parsed.externalKey,
                  entry_reference: tx?.entry_reference || null,
                  transaction_id: tx?.transaction_id || null,
                  booking_status: parsed.bookingStatus,
                  booking_date: parsed.bookingDate,
                  value_date: parsed.valueDate,
                  transaction_date: parsed.transactionDate,
                  amount: parsed.amount,
                  currency: parsed.currency,
                  credit_debit_indicator: parsed.creditDebitIndicator,
                  description: parsed.description,
                  counterparty_name: parsed.counterpartyName,
                  raw_json: tx,
                  updated_at: new Date().toISOString(),
                };
              });

              const uniqueMap = new Map<string, any>();
              for (const row of rowsToUpsert) {
                uniqueMap.set(row.external_key, row);
              }

              await adminClient
                .from("bank_transactions")
                .upsert(Array.from(uniqueMap.values()), {
                  onConflict: "bank_account_id,external_key",
                });
            }

            await adminClient
              .from("bank_accounts")
              .update({
                continuation_key: nextContinuationKey,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", acc.id);
          } catch (err: any) {
            const status = err?.status;
            const message = err?.message || "Kunde inte uppdatera konto";
            syncErrors.push(`${acc.name}: ${message}`);

            // If Enable Banking returns 401/403/422 due to expired or revoked consent, mark connection expired
            if (status === 401 || status === 403 || message.toLowerCase().includes("expired") || message.toLowerCase().includes("consent")) {
              await adminClient
                .from("bank_connections")
                .update({
                  status: "expired",
                  last_error: "Samtycket hos banken har gått ut eller återkallats. Förnya åtkomsten.",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", conn.id);
            } else {
              await adminClient
                .from("bank_connections")
                .update({
                  last_error: message,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", conn.id);
            }
          }
        }

        if (syncErrors.length === 0) {
          const nowIso = new Date().toISOString();
          await adminClient
            .from("bank_connections")
            .update({
              status: "active",
              last_synced_at: nowIso,
              last_error: null,
              updated_at: nowIso,
            })
            .eq("id", conn.id);
        }
      }

      const { data: refreshedConnections } = await adminClient
        .from("bank_connections")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "revoked")
        .order("created_at", { ascending: false });

      const { data: refreshedAccounts } = await adminClient
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      return new Response(
        JSON.stringify({
          connections: refreshedConnections || [],
          accounts: refreshedAccounts || [],
          syncErrors,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: list-transactions (Paginated query of bank_transactions separated by status)
    // -------------------------------------------------------------------------
    if (action === "list-transactions") {
      const bankAccountId = body?.bankAccountId ? String(body.bankAccountId) : null;
      const statusFilter = body?.statusFilter as "all" | "booked" | "reserved" | undefined;
      const page = Math.max(1, Number(body?.page) || 1);
      const pageSize = Math.min(100, Math.max(10, Number(body?.pageSize) || 30));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Only show transactions from selected accounts of active/expired (non-revoked) connections
      const { data: selectedAccounts } = await adminClient
        .from("bank_accounts")
        .select("id, name, currency, continuation_key, connection_id")
        .eq("user_id", user.id)
        .eq("is_selected", true);

      const allowedAccountIds = (selectedAccounts || []).map((a) => a.id);

      if (allowedAccountIds.length === 0) {
        return new Response(
          JSON.stringify({
            transactions: [],
            totalCount: 0,
            bookedCount: 0,
            reservedCount: 0,
            page,
            pageSize,
            hasMorePages: false,
            accountsWithMoreHistory: [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const targetIds = bankAccountId
        ? allowedAccountIds.filter((id) => id === bankAccountId)
        : allowedAccountIds;

      if (targetIds.length === 0) {
        return new Response(
          JSON.stringify({
            transactions: [],
            totalCount: 0,
            bookedCount: 0,
            reservedCount: 0,
            page,
            pageSize,
            hasMorePages: false,
            accountsWithMoreHistory: [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Count booked vs reserved for badges
      const { count: bookedCount } = await adminClient
        .from("bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("bank_account_id", targetIds)
        .eq("booking_status", "BOOK");

      const { count: reservedCount } = await adminClient
        .from("bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("bank_account_id", targetIds)
        .in("booking_status", ["PDNG", "HOLD"]);

      let txQuery = adminClient
        .from("bank_transactions")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .in("bank_account_id", targetIds);

      if (statusFilter === "booked") {
        txQuery = txQuery.eq("booking_status", "BOOK");
      } else if (statusFilter === "reserved") {
        txQuery = txQuery.in("booking_status", ["PDNG", "HOLD"]);
      }

      const { data: txRows, count: totalCount, error: txErr } = await txQuery
        .order("booking_date", { ascending: false, nullsFirst: true })
        .order("transaction_date", { ascending: false, nullsFirst: true })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (txErr) {
        throw new Error(`Kunde inte läsa banktransaktioner: ${txErr.message}`);
      }

      const accountsWithMoreHistory = (selectedAccounts || [])
        .filter((a) => targetIds.includes(a.id) && Boolean(a.continuation_key))
        .map((a) => a.id);

      return new Response(
        JSON.stringify({
          transactions: txRows || [],
          totalCount: totalCount || 0,
          bookedCount: bookedCount || 0,
          reservedCount: reservedCount || 0,
          page,
          pageSize,
          hasMorePages: totalCount ? to + 1 < totalCount : false,
          accountsWithMoreHistory,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // ACTION: disconnect (Revoke consent via DELETE /sessions/{session_id} and clean up)
    // -------------------------------------------------------------------------
    if (action === "disconnect") {
      const connectionId = String(body?.connectionId || "").trim();
      if (!connectionId) {
        return new Response(
          JSON.stringify({ error: "Saknar connectionId." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: conn } = await adminClient
        .from("bank_connections")
        .select("*")
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!conn) {
        return new Response(
          JSON.stringify({ error: "Bankanslutningen hittades inte." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: providerSession } = await adminClient
        .from("bank_provider_sessions")
        .select("provider_session_id")
        .eq("connection_id", connectionId)
        .eq("user_id", user.id)
        .maybeSingle();

      let providerRevoked = false;
      if (providerSession?.provider_session_id) {
        try {
          const envToUse: "production" | "sandbox" =
            conn.environment === "sandbox" ? "sandbox" : "production";
          await enableBankingRequest(
            `/sessions/${encodeURIComponent(providerSession.provider_session_id)}`,
            {
              method: "DELETE",
              environment: envToUse,
              psuIpAddress,
              psuUserAgent,
            },
          );
          providerRevoked = true;
        } catch (revokeErr: any) {
          // Even if the bank session was already expired/revoked on Enable Banking's side,
          // we still complete local cleanup and stop all future sync.
          console.warn("Enable Banking session revoke notice:", revokeErr?.message || revokeErr);
        }
      }

      // Delete connection (cascades to bank_provider_sessions, bank_accounts, bank_transactions)
      const { error: deleteErr } = await adminClient
        .from("bank_connections")
        .delete()
        .eq("id", connectionId)
        .eq("user_id", user.id);

      if (deleteErr) {
        throw new Error(`Kunde inte ta bort bankanslutning: ${deleteErr.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          providerRevoked,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: `Okänd åtgärd: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("enable-banking edge function error:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Ett oväntat fel uppstod vid kommunikation med banktjänsten.",
      }),
      { status: error?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
