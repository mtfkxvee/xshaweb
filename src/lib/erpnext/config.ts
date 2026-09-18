export type ErpnextConfig = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

export function getErpnextConfig(): ErpnextConfig | null {
  const url = process.env.ERPNEXT_URL;
  const apiKey = process.env.ERPNEXT_API_KEY;
  const apiSecret = process.env.ERPNEXT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return null;
  return { url: url.replace(/\/$/, ""), apiKey, apiSecret };
}

export function isErpnextConfigured(): boolean {
  return getErpnextConfig() !== null;
}

export type GoogleOAuthConfig = { clientId: string; clientSecret: string };

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export type DokuConfig = { clientId: string; secretKey: string; baseUrl: string };

export function getDokuConfig(): DokuConfig | null {
  const clientId = process.env.DOKU_CLIENT_ID;
  const secretKey = process.env.DOKU_SECRET_KEY;
  const baseUrl = process.env.DOKU_BASE_URL;
  if (!clientId || !secretKey || !baseUrl) return null;
  return { clientId, secretKey, baseUrl: baseUrl.replace(/\/$/, "") };
}
