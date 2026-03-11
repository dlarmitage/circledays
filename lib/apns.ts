import * as http2 from 'http2';
import * as crypto from 'crypto';

const APNS_HOST_PRODUCTION = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';
const TOKEN_TTL_MS = 50 * 60 * 1000; // Refresh JWT every 50 minutes (Apple allows 60)

let cachedToken: { jwt: string; expiresAt: number } | null = null;

function getApnsHost(): string {
  return process.env.APNS_ENVIRONMENT === 'production'
    ? APNS_HOST_PRODUCTION
    : APNS_HOST_SANDBOX;
}

function generateJwt(): string {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.jwt;
  }

  const keyId = process.env.APNS_KEY_ID!;
  const teamId = process.env.APNS_TEAM_ID!;
  const keyBase64 = process.env.APNS_KEY!;

  const key = Buffer.from(keyBase64, 'base64').toString('utf-8');

  // Header
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');

  // Payload
  const payload = Buffer.from(JSON.stringify({ iss: teamId, iat: now })).toString('base64url');

  // Sign
  const signer = crypto.createSign('SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(key, 'base64url');

  const jwt = `${header}.${payload}.${signature}`;

  cachedToken = { jwt, expiresAt: Date.now() + TOKEN_TTL_MS };
  return jwt;
}

export interface PushResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<PushResult> {
  const bundleId = 'technology.ambient.circledays';

  return new Promise((resolve) => {
    const client = http2.connect(`https://${getApnsHost()}`);

    client.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    const jwt = generateJwt();

    const payload = JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
      },
      ...data,
    });

    const headers = {
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    };

    const req = client.request(headers);

    let responseData = '';
    let statusCode = 0;

    req.on('response', (headers) => {
      statusCode = headers[':status'] as number;
    });

    req.on('data', (chunk) => {
      responseData += chunk;
    });

    req.on('end', () => {
      client.close();

      if (statusCode === 200) {
        resolve({ success: true, statusCode });
      } else {
        let errorReason = `HTTP ${statusCode}`;
        try {
          const parsed = JSON.parse(responseData);
          errorReason = parsed.reason || errorReason;
        } catch {
          // Use status code as error
        }
        resolve({ success: false, error: errorReason, statusCode });
      }
    });

    req.on('error', (err) => {
      client.close();
      resolve({ success: false, error: err.message });
    });

    req.end(payload);
  });
}

export async function sendPushNotifications(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<PushResult[]> {
  return Promise.all(
    deviceTokens.map((token) => sendPushNotification(token, title, body, data))
  );
}
