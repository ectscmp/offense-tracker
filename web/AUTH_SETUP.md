# Real Microsoft sign-in setup

The app already has the Auth.js Microsoft Entra ID provider, tenant validation, and session
mapping wired. The only missing pieces are the app-registration values from your school
tenant.

> Do not paste the client secret into chat, source files, or Git. Put it in `web/.env.local`
> locally and in the hosting provider's secret store in production.

## 1. Register the app in Entra

1. Open the [Microsoft Entra admin center](https://entra.microsoft.com/) and sign in with an
   account that can create app registrations.
2. Go to **Identity → Applications → App registrations → New registration**.
3. Name it **Offense Tracker**.
4. Choose **Accounts in this organizational directory only** (single tenant).
5. Under **Redirect URI**, select **Web** and enter:
   ```text
   http://localhost:3000/api/auth/callback/microsoft-entra-id
   ```
6. Create the registration.

For a deployed build, add the production URI on the same **Authentication** page:

```text
https://your-domain.example/api/auth/callback/microsoft-entra-id
```

## 2. Copy the identifiers

From **Overview**, copy:

- **Application (client) ID**
- **Directory (tenant) ID**

From **Certificates & secrets → Client secrets → New client secret**, create a secret and copy
the **Value** immediately. The Secret ID is not the secret value.

## 3. Configure `web/.env.local`

```env
AUTH_MICROSOFT_ENTRA_ID_ID=<application-client-id>
AUTH_MICROSOFT_ENTRA_ID_SECRET=<client-secret-value>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<directory-tenant-id>/v2.0

AUTH_SECRET=<long-random-value>
AUTH_TRUST_HOST=true

# At least one teacher allowlist is required.
AUTH_TEACHER_ROLES=Teacher
```

### Teacher allowlist

Sign-in is fail-closed: if no teacher allowlist is configured, nobody can sign in. Choose one
of these approaches.

**App role (recommended)**

1. In the app registration, open **App roles → Create app role**.
2. Use display name **Teacher**, allowed member type **Users/Groups**, and value **Teacher**.
3. Open **Enterprise applications → Offense Tracker → Users and groups** and assign the teacher
   accounts or a teachers security group to the **Teacher** role.
4. Set `AUTH_TEACHER_ROLES=Teacher`.

**Security group**

1. Create or choose a security group containing only teachers.
2. In the app registration, open **Token configuration → Add groups claim** and select the
   security-group option you use.
3. Copy the group's **Object ID** and set `AUTH_TEACHER_GROUPS=<object-id>`.

Large tenants can emit a groups-overage claim instead of the group list. If that happens, use
app roles or an email allowlist instead.

**Small-pilot allowlist**

```env
AUTH_ALLOWED_EMAILS=teacher@district.org,another.teacher@district.org
# Or:
AUTH_ALLOWED_DOMAINS=district.org
```

A domain allowlist may also admit student accounts. Prefer an app role or group for a real
deployment.

Generate `AUTH_SECRET` with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Use the tenant ID in the issuer, not `common`, `organizations`, or `consumers`. The app checks
the token's tenant ID when a tenant-specific issuer is configured.

Write the issuer exactly as Microsoft publishes it: `/v2.0`, with **no trailing slash**. The
OIDC client compares the discovery document's issuer byte-for-byte; a trailing slash produces
`"response" body "issuer" property does not match the expected value`. The app strips a trailing
slash defensively, but keeping the value canonical avoids confusion.

## 4. Verify and restart

```powershell
cd web
npm run auth:check
npm run dev
```

`auth:check` confirms the Entra values, teacher allowlist, tenant, and callback URL.

Then open **http://localhost:3000/login** and choose **Continue with Microsoft**.

## 5. Production

- Add the three Entra values, `AUTH_SECRET`, and a teacher allowlist to the hosting provider's
  environment.
- Use HTTPS for the callback URL.
- Keep the app registration single-tenant.
- Add the production callback URI in Entra.
- Check tenant Conditional Access, MFA, and admin-consent policies.
- Rotate the client secret before expiry and store the new value in the secret manager.

## API permissions

Sign-in needs the standard OIDC scopes (`openid profile email`). This slice does not call
Microsoft Graph for rosters. If you later add Graph EDU roster sync, add the delegated
permissions and admin consent at that point.

## Troubleshooting

| Symptom | Check |
|---|---|
| `redirect_uri` mismatch | The exact URI must be registered under **Web**, including the path |
| `invalid_client` | Client ID/secret mismatch; use the secret **Value**, not Secret ID |
| Tenant error or `AccessDenied` | Issuer tenant ID and the account’s tenant must match |
| `"issuer" property does not match` | Issuer has a trailing slash or uses the domain instead of the tenant GUID; use `https://login.microsoftonline.com/<tenant-id>/v2.0` |
| `Configuration` error | Run `npm run auth:check`; restart after editing `.env.local` |
| Sign-in succeeds but returns to login | Account has no email/UPN, or the teacher record cannot be created |
