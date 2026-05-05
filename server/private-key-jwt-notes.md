# Private Key JWT Notes

The `paymentsapi.yaml` file mentions `private_key_jwt` client authentication.

This draft does not implement token exchange yet because that should be done inside the real Next.js server runtime with a vetted JWT library.

Implementation shape:

1. Build JWT header:
   - `alg`: likely `RS256`
   - `kid`: `PNZ_CLIENT_KEY_ID`
   - `typ`: `JWT`

2. Build JWT claims:
   - `iss`: `PNZ_CLIENT_ID`
   - `sub`: `PNZ_CLIENT_ID`
   - `aud`: token endpoint URL
   - `jti`: random UUID
   - `iat`: current Unix timestamp
   - `exp`: short expiry, usually within 5 minutes

3. Sign using `PNZ_CLIENT_PRIVATE_KEY`.

4. Submit token request with:
   - `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`
   - `client_assertion=<signed-jwt>`

Recommended library later:

- `jose`

