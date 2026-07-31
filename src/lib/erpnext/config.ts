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
