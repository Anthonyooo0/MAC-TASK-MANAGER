const CLIENT_ID = process.env.AZURE_CLIENT_ID || '89dd1228-06e7-4368-89d3-bcec7afb521a';
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';
const TENANT_ID = process.env.AZURE_TENANT_ID || '422e0e56-e8fe-4fc5-8554-b9b89f3cadac';

let cachedToken = null;
let tokenExpiry = 0;

async function getGraphToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token request failed: ${err}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

module.exports = { getGraphToken };
