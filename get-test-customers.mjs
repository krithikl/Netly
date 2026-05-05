import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Load env
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Parse .env file - handles multiline values
const parsed = {};
let currentKey = null;
let currentValue = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  
  // Check if this line starts a new key=value pair
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    // If we have a previous key, save it
    if (currentKey) {
      parsed[currentKey] = currentValue.trim().replace(/^"/, '').replace(/"$/, '');
    }
    
    const [key, ...valueParts] = trimmed.split('=');
    currentKey = key.trim();
    currentValue = valueParts.join('=');
  } else if (currentKey && trimmed) {
    // This is a continuation of the previous value
    currentValue += '\n' + line;
  }
});

// Don't forget the last key
if (currentKey) {
  parsed[currentKey] = currentValue.trim().replace(/^"/, '').replace(/"$/, '');
}

const baseUrl = parsed.PNZ_BASE_URL;
const apiVersion = parsed.PNZ_API_VERSION;
const clientId = parsed.PNZ_CLIENT_ID;
const clientKeyId = parsed.PNZ_CLIENT_KEY_ID;
const privateKeyPem = parsed.PNZ_CLIENT_PRIVATE_KEY;

console.log('🔍 Config loaded:');
console.log(`Base URL: ${baseUrl}`);
console.log(`API Version: ${apiVersion}`);
console.log(`Client ID: ${clientId}`);
console.log(`Private Key (first 100 chars): ${privateKeyPem.substring(0, 100)}`);

// Helper to create JWT
function createJwt(header, payload, privateKey) {
  const normalizedKey = privateKey.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  
  const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const message = `${headerBase64}.${payloadBase64}`;
  
  const sign = crypto.createSign('RSA-SHA512');
  sign.update(message);
  const signature = sign.sign({
    key: normalizedKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 64
  });
  
  const signatureBase64 = Buffer.from(signature).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${message}.${signatureBase64}`;
}

// Create client assertion
const now = Math.floor(Date.now() / 1000);
const clientAssertion = createJwt(
  { alg: 'PS512', kid: clientKeyId, typ: 'JWT' },
  {
    iss: clientId,
    sub: clientId,
    aud: `${baseUrl}/oauth/v2.0/token`,
    exp: now + 3600,
    iat: now
  },
  privateKeyPem
);

// Get token
console.log('\n🔐 Getting client credentials token...');
const tokenResponse = await fetch(`${baseUrl}/oauth/v2.0/token`, {
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
    'x-fapi-interaction-id': crypto.randomUUID()
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'openid accounts payments',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion
  }).toString()
});

const tokenData = await tokenResponse.json();

if (!tokenResponse.ok) {
  console.error('❌ Token request failed:', tokenData);
  process.exit(1);
}

console.log('✅ Token received:', tokenData.access_token.substring(0, 20) + '...');

// Get accounts
console.log('\n📋 Fetching test customers and accounts...');
const accountsResponse = await fetch(
  `${baseUrl}/open-banking-nz/${apiVersion}/accounts`,
  {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${tokenData.access_token}`,
      'x-fapi-interaction-id': crypto.randomUUID()
    }
  }
);

const accountsData = await accountsResponse.json();

if (!accountsResponse.ok) {
  console.error('❌ Accounts request failed:', accountsData);
  process.exit(1);
}

console.log('\n✅ Test Customers and Accounts:');
console.log(JSON.stringify(accountsData, null, 2));
