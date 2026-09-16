import { authenticateWithErpnext } from "./auth";
import { erpRequest, jsonFields, jsonFilters } from "./client";
import { getGoogleOAuthConfig, isErpnextConfigured } from "./config";

const CALLBACK_URL_PATH = "/api/mobile/auth/google/callback";

// Builds the "Sign in with Google" URL the mobile app opens in an in-app
// browser. Google redirects back to our own callback below (registered as
// a second Authorized redirect URI on the same Web OAuth client ERPNext's
// Social Login Key already uses) — not to ERPNext's own OAuth callback,
// since that one only knows how to finish the flow with a cookie session,
// which a mobile app has no use for.
export function buildGoogleAuthUrl(origin: string): string | null {
  const google = getGoogleOAuthConfig();
  if (!google) return null;

  const params = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: `${origin}${CALLBACK_URL_PATH}`,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type GoogleTokenResponse = { access_token: string; id_token: string };
type GoogleUserInfo = { email: string; email_verified: boolean; name?: string };

async function exchangeCodeForGoogleProfile(
  code: string,
  redirectUri: string,
): Promise<GoogleUserInfo | { error: string }> {
  const google = getGoogleOAuthConfig();
  if (!google) return { error: "Google OAuth belum dikonfigurasi di server." };

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: google.clientId,
      client_secret: google.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return { error: `Gagal menukar kode Google (${tokenRes.status}): ${await tokenRes.text()}` };
  }
  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return { error: `Gagal mengambil profil Google (${userRes.status})` };
  const profile = (await userRes.json()) as GoogleUserInfo;
  if (!profile.email || !profile.email_verified) {
    return { error: "Email Google tidak terverifikasi." };
  }
  return profile;
}

type ErpUserRow = { name: string };

async function findUserByEmail(email: string): Promise<ErpUserRow | null> {
  const res = await erpRequest<{ data: ErpUserRow[] }>("/api/resource/User", {
    params: {
      fields: jsonFields(["name"]),
      filters: jsonFilters([["name", "=", email]]),
      limit_page_length: "1",
    },
  });
  return res.data[0] ?? null;
}

async function customerExistsForEmail(email: string): Promise<boolean> {
  const res = await erpRequest<{ data: { name: string }[] }>("/api/resource/Customer", {
    params: {
      fields: jsonFields(["name"]),
      filters: jsonFilters([["Portal User", "user", "=", email]]),
      limit_page_length: "1",
    },
  });
  return res.data.length > 0;
}

// Creates the Frappe User + Customer + Portal User link a brand-new Google
// sign-up needs — this is the actual "daftar" (registration) half of the
// flow. Existing customers just fall straight through to the password-reset
// step below.
async function provisionNewCustomer(email: string, name: string): Promise<void> {
  await erpRequest("/api/resource/User", {
    method: "POST",
    body: {
      email,
      first_name: name || email.split("@")[0],
      send_welcome_email: 0,
      user_type: "Website User",
      roles: [{ role: "Customer" }],
    },
  });

  const customerRes = await erpRequest<{ data: { name: string } }>("/api/resource/Customer", {
    method: "POST",
    body: {
      customer_name: name || email,
      customer_type: "Individual",
      customer_group: "MEMBER",
      portal_users: [{ user: email }],
    },
  });

  // Loyalty enrollment mirrors what the existing member base already has
  // (Loyalty Program "MEMBER") so a Google sign-up isn't missing it.
  await erpRequest(`/api/resource/Customer/${encodeURIComponent(customerRes.data.name)}`, {
    method: "PUT",
    body: { loyalty_program: "MEMBER" },
  }).catch(() => {});
}

export type GoogleLoginResult =
  | { ok: true; sid: string }
  | { ok: false; message: string };

// The whole "sign in / sign up with Google" flow: exchange the code,
// provision a User+Customer if this email has never signed in before, then
// finish with a real Frappe session via a one-time random password — this
// reuses loginCustomer's own login path end to end instead of inventing a
// second, parallel auth mechanism (API-key tokens, custom sessions, etc.)
// that every other endpoint would then have to know how to handle too.
export async function loginOrSignupWithGoogle(
  code: string,
  redirectUri: string,
): Promise<GoogleLoginResult> {
  if (!isErpnextConfigured()) return { ok: false, message: "ERPNext belum dikonfigurasi." };

  const profile = await exchangeCodeForGoogleProfile(code, redirectUri);
  if ("error" in profile) return { ok: false, message: profile.error };

  const email = profile.email;

  try {
    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
      await provisionNewCustomer(email, profile.name ?? "");
    } else if (!(await customerExistsForEmail(email))) {
      // A Frappe User already exists (e.g. an internal account) but has no
      // linked Customer yet — link one instead of erroring out.
      await provisionNewCustomer(email, profile.name ?? "");
    }

    const randomPassword = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}Aa1!`;
    await erpRequest(`/api/resource/User/${encodeURIComponent(email)}`, {
      method: "PUT",
      body: { new_password: randomPassword },
    });

    const loginResult = await authenticateWithErpnext(email, randomPassword);
    if (!loginResult.ok) return { ok: false, message: loginResult.message };
    return { ok: true, sid: loginResult.sid };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Gagal memproses akun Google.",
    };
  }
}
