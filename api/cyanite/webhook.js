import crypto from 'node:crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_TIMESTAMP_DRIFT_SECONDS = 5 * 60;

async function readRawBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function timingSafeStringEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyLegacyCyaniteSignature(secret, signature, rawBody) {
  if (!secret || !signature) return false;

  // Older Cyanite integrations sign the raw request body with HMAC-SHA512
  // and send the hex digest in the `Signature` header.
  const possibleSecrets = [secret];
  if (secret.startsWith('whsec_')) possibleSecrets.push(secret.slice(6));

  return possibleSecrets.some((candidate) => {
    const expected = crypto
      .createHmac('sha512', candidate)
      .update(rawBody)
      .digest('hex');
    return timingSafeStringEqual(signature, expected);
  });
}

function decodeStandardWebhookSecret(secret) {
  if (!secret) return null;
  const value = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  try {
    return Buffer.from(value, 'base64');
  } catch {
    return null;
  }
}

function verifyStandardWebhook(secret, headers, rawBody) {
  const messageId = headers['webhook-id'];
  const timestamp = headers['webhook-timestamp'];
  const signatureHeader = headers['webhook-signature'];

  if (!secret || !messageId || !timestamp || !signatureHeader) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber);
  if (age > MAX_TIMESTAMP_DRIFT_SECONDS) return false;

  const key = decodeStandardWebhookSecret(secret);
  if (!key || key.length === 0) return false;

  const signedContent = Buffer.concat([
    Buffer.from(`${messageId}.${timestamp}.`),
    rawBody,
  ]);

  const expected = crypto
    .createHmac('sha256', key)
    .update(signedContent)
    .digest('base64');

  return String(signatureHeader)
    .split(' ')
    .some((token) => {
      const [version, signature] = token.split(',', 2);
      return version === 'v1' && timingSafeStringEqual(signature, expected);
    });
}

function parsePayload(rawBody) {
  if (!rawBody.length) return {};
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    return null;
  }
}

export default async function handler(request, response) {
  if (request.method === 'GET') {
    return response.status(200).json({
      ok: true,
      service: 'FORTISSIMO Reference Finder / Cyanite webhook',
      configured: Boolean(process.env.CYANITE_WEBHOOK_SECRET),
    });
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const rawBody = await readRawBody(request);
  const payload = parsePayload(rawBody);

  if (payload === null) {
    // Cyanite recommends a quick response. Invalid bodies are acknowledged but ignored.
    console.warn('[cyanite] ignored invalid JSON payload');
    return response.status(200).json({ ok: false, ignored: true, reason: 'invalid_json' });
  }

  const secret = process.env.CYANITE_WEBHOOK_SECRET || '';
  const legacySignature = request.headers.signature;
  const hasStandardHeaders = Boolean(
    request.headers['webhook-id'] ||
      request.headers['webhook-timestamp'] ||
      request.headers['webhook-signature']
  );
  const hasLegacySignature = Boolean(legacySignature);

  // Cyanite's web-app test event intentionally has no signature header.
  const isUnsignedTestEvent = !hasStandardHeaders && !hasLegacySignature;

  let verified = false;
  let signatureVersion = null;

  if (hasStandardHeaders) {
    verified = verifyStandardWebhook(secret, request.headers, rawBody);
    signatureVersion = 'standard-webhooks-v1';
  } else if (hasLegacySignature) {
    verified = verifyLegacyCyaniteSignature(secret, String(legacySignature), rawBody);
    signatureVersion = 'cyanite-legacy-sha512';
  }

  if (!isUnsignedTestEvent && !verified) {
    console.warn('[cyanite] ignored webhook with invalid or unconfigured signature', {
      signatureVersion,
      secretConfigured: Boolean(secret),
    });

    // Cyanite recommends returning quickly and avoiding retries for ignored events.
    return response.status(200).json({
      ok: false,
      ignored: true,
      reason: secret ? 'invalid_signature' : 'webhook_secret_not_configured',
    });
  }

  const eventType = payload.type || payload.event || payload.eventType || 'unknown';
  const trackId =
    payload?.data?.track?.id ||
    payload?.data?.libraryTrack?.id ||
    payload?.libraryTrackId ||
    payload?.trackId ||
    null;

  console.log('[cyanite] webhook received', {
    eventType,
    trackId,
    verified,
    testEvent: isUnsignedTestEvent,
  });

  // Phase 1 only acknowledges the event. In the next phase Reference Finder
  // will enqueue result retrieval/storage here after secrets are configured.
  return response.status(200).json({
    ok: true,
    received: true,
    verified,
    testEvent: isUnsignedTestEvent,
    eventType,
    trackId,
  });
}
