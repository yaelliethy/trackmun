# Email Service - TrackMUN

Transactional email service for the TrackMUN platform using **Brevo** (formerly Sendinblue).

## Overview

This service handles all email communications in the TrackMUN platform:

- **Welcome emails** - Sent when a delegate registers
- **QR reminder emails** - Sent before the conference
- **Password reset emails** - Sent when users request password recovery

## Setup

### 1. Create a Brevo Account

1. Go to [Brevo.com](https://www.brevo.com/) and create a free account
2. Verify your sender domain or email address in **Senders & IPs** settings
3. Generate an API key in **Settings > API Keys**

### 2. Create Email Templates

In Brevo dashboard, go to **Transactional Emails > Templates** and create:

#### Welcome Email Template (ID: 1)
- **Subject**: `Welcome to {{CONFERENCE_NAME}}, {{NAME}}!`
- **Variables**: `NAME`, `QR_LINK`, `CONFERENCE_NAME`
- **HTML**:
```html
<p>Hi {{NAME}},</p>
<p>Welcome to TrackMUN Conference!</p>
<p>Your personal QR code is ready:</p>
<p><a href="{{QR_LINK}}">View Your QR Code</a></p>
<p>Show this QR code at check-in and benefit redemption counters.</p>
<p>See you at the conference!</p>
```

#### QR Reminder Template (ID: 2)
- **Subject**: `{{DAYS_LEFT}} days until TrackMUN!`
- **Variables**: `NAME`, `DAYS_LEFT`, `CONFERENCE_NAME`

#### Password Reset Template (ID: 3)
- **Subject**: `Reset Your TrackMUN Password`
- **Variables**: `NAME`, `RESET_LINK`

### 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cd apps/worker
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:

```env
# Brevo API Key (from Brevo dashboard)
BREVO_API_KEY="xkeysib-your-api-key"

# Sender configuration (must match verified sender in Brevo)
BREVO_SENDER_EMAIL="noreply@yourconference.org"
BREVO_SENDER_NAME="TrackMUN Conference"

# Template IDs (from Brevo template URLs)
BREVO_WELCOME_TEMPLATE_ID="1"
BREVO_QR_REMINDER_TEMPLATE_ID="2"
BREVO_PASSWORD_RESET_TEMPLATE_ID="3"

# Other required secrets
JWT_SECRET="your-jwt-secret-min-32-chars"
QR_SECRET="your-qr-secret-min-32-chars"
FRONTEND_URL="http://localhost:5173"
```

### 4. Set Production Secrets

For production deployment, set secrets via Wrangler CLI:

```bash
wrangler secret put BREVO_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put QR_SECRET
```

## Usage

### Sending a Welcome Email

```typescript
import { createEmailService } from './services/email/email.service';

// In your route handler
const emailService = createEmailService(c.env);

// Send welcome email (non-blocking)
c.executionCtx.waitUntil(
  emailService.sendWelcomeEmail(
    user.email,
    user.name,
    qrToken
  )
);
```

### Sending a Custom Email

```typescript
import { EmailService } from './services/email/email.service';

const emailService = new EmailService({
  brevoApiKey: env.BREVO_API_KEY,
  senderEmail: env.BREVO_SENDER_EMAIL,
  senderName: env.BREVO_SENDER_NAME,
  frontendUrl: env.FRONTEND_URL,
});

await emailService.send({
  to: 'user@example.com',
  name: 'User Name',
  templateId: 1,
  params: {
    NAME: 'User Name',
    QR_LINK: 'https://app.trackmun.app/qr/token',
    CONFERENCE_NAME: 'TrackMUN',
  },
});
```

## Testing

Run unit tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

## Rate Limits

| Plan | Daily Limit | Monthly Limit |
|------|-------------|---------------|
| Free | 300 emails  | 9,000 emails  |
| Starter | 20,000 emails/month | - |

For most MUN conferences, the free tier is sufficient:
- ~50 delegates × 2 emails (welcome + reminder) = 100 emails
- Well within the 300/day limit

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Ensure `BREVO_API_KEY` is correct and not expired
2. **Verify Sender**: The `BREVO_SENDER_EMAIL` must be verified in Brevo dashboard
3. **Check Template ID**: Template IDs must match those in your Brevo account
4. **Review Logs**: Check Worker logs for error messages

### Template Variables Not Rendering

Ensure variable names in your Brevo template match exactly (case-sensitive):
- Use `{{NAME}}` not `{{name}}`
- All params must be strings, not numbers

### API Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 401 | Invalid API key | Check `BREVO_API_KEY` |
| 403 | Sender not verified | Verify sender in Brevo dashboard |
| 404 | Template not found | Check template ID |
| 400 | Invalid params | Ensure all required template variables are provided |

## File Structure

```
apps/worker/src/services/email/
├── index.ts                    # Exports
├── email.types.ts              # TypeScript types and interfaces
├── email.service.ts            # EmailService class and Brevo integration
└── __tests__/
    └── email.service.test.ts   # Unit tests
```

## Security Notes

- **Never commit** `.dev.vars` - it contains secrets
- API keys are stored in Cloudflare secrets (production) or `.dev.vars` (development)
- Email sending is non-blocking - failures don't block user registration
- Errors are logged but not exposed to users

## Migration from Resend

If migrating from Resend:

1. Update environment variables (API key format differs)
2. Update template variable syntax (Resend uses `{{variable}}`, Brevo uses `{{VARIABLE}}`)
3. Update API payload structure (see `email.service.ts`)
4. Test all email templates before going live

## Resources

- [Brevo API Documentation](https://developers.brevo.com/reference/sendtransacemail)
- [Brevo Transactional Email Guide](https://help.brevo.com/hc/en-us/categories/360000160030-Transactional-emails)
- [Cloudflare Workers Fetch API](https://developers.cloudflare.com/workers/runtime-apis/fetch/)
