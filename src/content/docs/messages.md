---
title: Email & SMS mocking
description: Capture the mail and SMS your application sends — Mockifyr answers like the real SMTP server or Twilio, delivers nothing, and lets a test read the OTP back in one call.
---

Mockifyr mocks **message channels** as well as APIs. Your application sends real email (SMTP) and
real SMS (through a provider HTTP API); Mockifyr stands in for the real infrastructure — it answers
like the real thing, **captures everything into a tenant-scoped inbox, and delivers nothing**.
That is two mocks in one: the protocol answer your app expects, and the capture your test asserts on.

```text
your app ──mail──▶  Mockifyr SMTP (:1025)     ─┐
your app ──SMS───▶  Mockifyr Twilio profile   ─┤─▶ tenant inbox ─▶ dashboard + /__admin/messages
                                               ┘        (nothing is ever delivered)
```

Everything here is **opt-in**: without the flags there is no listener, no routes, no behavior change.

## Email — the SMTP capture server

```bash
mockifyr --port 8080 --smtp-port 1025
```

Point your application's mail settings at `localhost:1025`. The listener speaks enough ESMTP for
real clients (MailKit, Jakarta Mail, `smtplib`, …): `EHLO`, `MAIL FROM`, `RCPT TO`, `DATA` with
dot-unstuffing, `RSET`, `NOOP`, `QUIT` — and `AUTH PLAIN`/`LOGIN`, **accepted without checking**.

- **The AUTH username selects the tenant** — the SMTP analog of the `X-Mockifyr-Tenant` header.
  No AUTH → the default tenant.
- The captured envelope keeps the parsed subject, text and HTML bodies, attachments, and the
  **full raw MIME byte-for-byte** (the dashboard's Source tab shows it, Mailpit-style).
- `To` records the **envelope recipients** (`RCPT TO`) — who actually received it; the `To:` header
  is kept in `meta.headerTo`.

## SMS — the Twilio provider profile

SMS has no wire protocol of its own — applications send through a provider's HTTP API. So SMS
mocking is a **provider profile** on the HTTP facade:

```bash
mockifyr --port 8080 --sms-profile twilio
```

This mounts `POST /2010-04-01/Accounts/{AccountSid}/Messages.json`. Point the SDK's base URL at
Mockifyr — **the official Twilio SDK works unchanged**: the response carries a realistic `sid`,
`status: queued`, segments and timestamps, and missing fields answer Twilio's real error codes
(21604 missing To, 21603 missing From/MessagingServiceSid, 21602 missing Body).

**A hand-written stub on the same URL still wins.** The profile peeks the engine first and steps
aside on a match — so the full dynamic engine (matchers, templating, scenarios, delays, faults)
remains available for SMS whenever you want it; the profile is the zero-config fallback.

## The Messages screen

The dashboard's **Messages** page lists every captured message (channel, recipients, content with
OTP badges, timestamps). A row opens the detail: sandboxed HTML **Preview**, plain **Text**, the
raw **Source**, and **Details** (ids and provider metadata, all copyable). SMS reads as a
conversation thread per recipient number with click-to-copy OTP badges.

## Verify and OTP — one call in your e2e test

```bash
# newest message for a recipient, code extracted (default pattern \b\d{4,8}\b)
curl "localhost:8080/__admin/messages/otp?recipient=%2B905551112233&channel=sms"
# → { "otp": "775533", "messageId": "…", "receivedAt": "…" }

# custom pattern — a capture group wins over the full match
curl "localhost:8080/__admin/messages/otp?recipient=omer@example.com&pattern=code%20(\d{6})"
```

List, count and filter with `channel`, `recipient` (case-insensitive substring over any addressee),
`contains` (subject + bodies), and `matches` (a regex with a 250 ms budget — a malformed pattern
filters to nothing, never errors). See the [admin API reference](/admin-api/) for every endpoint.

## Behaviors — make the channels misbehave on purpose

Per tenant, via the dashboard's **Channel behaviors** sheet or
`PUT /__admin/messages/behaviors`:

| Directive | Effect |
|-----------|--------|
| `smtpFault: "reject"` | every mail bounces with `550` — nothing is captured |
| `smtpFault: "drop"` | the connection closes mid-transaction |
| `smtpDelayMs` | the `DATA` acknowledgment is held for that long |
| `smsErrorCode` | every profile send answers that five-digit Twilio-style error |
| `webhookUrl` | every captured message is POSTed there as JSON (fire-and-forget) |

`--message-limit <n>` bounds each tenant's inbox (default 1000, oldest evicted first).

## Validation & limits

No reference oracle exists for message channels, so these features are validated by
**real-client self-tests** — MailKit drives the SMTP facade, the **official Twilio C# SDK** drives
the profile — plus mutation testing on the message logic. Current limits (tracked, not silent):
the inbox is in-memory only; there is no inbound simulation (Mockifyr never initiates a message to
your app); SMTP faults are tenant-wide, not rule-based; STARTTLS and other SMS providers are not
yet implemented.
