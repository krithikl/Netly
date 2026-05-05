import { randomUUID, createSign, constants, createHash, randomBytes } from "node:crypto";

type JwtPayload = Record<string, unknown>;

export function signPrivateKeyJwt({
  audience,
  clientId,
  keyId,
  privateKeyPem
}: {
  audience: string;
  clientId: string;
  keyId: string;
  privateKeyPem: string;
}) {
  const now = Math.floor(Date.now() / 1000);

  return signJwt(
    {
      iss: clientId,
      sub: clientId,
      aud: audience,
      jti: randomUUID(),
      iat: now,
      exp: now + 300
    },
    keyId,
    privateKeyPem
  );
}

export function signAuthorizationRequest({
  audience,
  claims,
  clientId,
  keyId,
  nonce,
  privateKeyPem,
  redirectUri,
  codeChallenge,
  responseType,
  responseMode,
  scope,
  state
}: {
  audience: string;
  claims: JwtPayload;
  clientId: string;
  keyId: string;
  nonce: string;
  privateKeyPem: string;
  redirectUri: string;
  codeChallenge?: string;
  responseType: string;
  responseMode?: string;
  scope: string;
  state: string;
}) {
  const now = Math.floor(Date.now() / 1000);

  return signJwt(
    {
      iss: clientId,
      aud: [audience],
      response_type: responseType,
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      nonce,
      nbf: now - 120,
      ...(responseMode ? { response_mode: responseMode } : {}),
      ...(codeChallenge
        ? {
            code_challenge: codeChallenge,
            code_challenge_method: "S256"
          }
        : {}),
      claims,
      iat: now,
      exp: now + 1800,
      jti: randomUUID()
    },
    keyId,
    privateKeyPem
  );
}

export function createPkcePair() {
  const verifier = base64Url(randomBytes(48));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());

  return {
    verifier,
    challenge
  };
}

function signJwt(payload: JwtPayload, keyId: string, privateKeyPem: string) {
  const encodedHeader = base64UrlJson({
    alg: "PS512",
    kid: keyId,
    typ: "JWT"
  });
  const encodedPayload = base64UrlJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA512");

  signer.update(signingInput);
  signer.end();

  const signature = signer.sign({
    key: normalizePrivateKey(privateKeyPem),
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 64
  });

  return `${signingInput}.${base64Url(signature)}`;
}

function base64UrlJson(value: unknown) {
  return base64Url(Buffer.from(JSON.stringify(value)));
}

function base64Url(value: Buffer) {
  return value
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(privateKeyPem: string) {
  return privateKeyPem
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/^'|'$/g, "");
}
