# Supabase Auth Configuration Checklist

## ✅ URL Configuration (Required)

**Go to: Supabase Dashboard → Auth → URL Configuration**

| Setting | Value |
|---------|-------|
| **Site URL** | `http://localhost:3000` |
| **Redirect URLs** | `http://localhost:3000/auth/callback` |

When deploying to production, add:
- `https://yourdomain.com/auth/callback`

---

## ✅ Email Templates (No Changes Needed)

Your email templates are already correctly configured if they use `{{ .ConfirmationURL }}`.

Supabase automatically constructs the correct callback URL based on your Site URL + Redirect URL settings above.

**Example of correct template (what you likely already have):**
```html
<a href="{{ .ConfirmationURL }}">Confirm your mail</a>
```

---

## OAuth Providers (Optional - Only If Needed Later)

> **Note:** This section is only relevant if you want to add "Sign in with Google", 
> "Sign in with GitHub", etc. If you're only using email/password auth, skip this.

For each OAuth provider (Google, GitHub, etc.):
1. Configure the provider in **Auth → Providers**
2. Add the callback URL to the provider's OAuth settings:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

## Environment Variables

Ensure these are set in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Used for email redirects
```

## Verification Steps

1. **Signup Flow**: Sign up with a new email, check that confirmation email arrives with correct link
2. **Email Confirmation**: Click confirmation link, verify it redirects to `/auth/callback` then `/dashboard`
3. **Login Flow**: Log in with confirmed user, verify redirect works
4. **Debug Page**: Visit `/auth/debug` in development to verify auth state

## Troubleshooting

### Callback 404
- Ensure `/auth/callback` route exists at `src/app/auth/callback/route.ts`
- Verify the Site URL and Redirect URLs are correctly configured

### Session Not Persisting
- Check that middleware is running and refreshing tokens
- Verify cookies are being set correctly

### OAuth Redirect Mismatch
- Ensure the callback URL in Supabase matches exactly what's in your OAuth provider config
- Check for trailing slashes - they must match exactly
