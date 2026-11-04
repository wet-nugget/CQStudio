# HTML quiz authoring and isolation

Upload one valid UTF-8 `.html` file. Default maximum is 20 MiB; administrators may raise it to the bucket's 50 MiB hard limit. It counts toward the uploader's and workspace quotas. For files over 5 MiB, compress embedded images/fonts before uploading.

Use inline `<script>` and `<style>` blocks. Embed images and fonts as `data:` URLs. External script sources, external stylesheet links, remote images/fonts, frames, plugins, base URLs, redirects, and external form destinations are rejected with original line numbers. Use a single `data:` image `src` rather than `srcset`. CSS imports are rejected. Browser and Edge validation are supplementary to sandbox restrictions, not permission to run trusted code.

The app fetches a signed attachment URL and sends the source to a different-origin static runner. Both the outer runner iframe and the nested Blob-document iframe have `sandbox="allow-scripts"` only. The nested quiz has no app origin, cookies, or localStorage; it cannot submit forms, open popups, navigate the top window, or download files. The runner's CSP blocks networking and remote resources. The app's own CSP keeps `script-src 'self'` and is never loosened for quizzes.

Optionally report one self-practice result:

```html
<script>
  parent.postMessage({ type: 'cq-result', score: 8, max: 10 }, '*');
</script>
```

Scores must be finite numbers, `0 <= score <= max`, `0 < max <= 1000000`. No other fields are accepted. The runner checks the inner window and forwards one result per load; the app checks its runner window and a per-load channel token. Preview never records a score. Practice records only after a valid result message; no message means no stored score. Scores are unverified self-practice, not assessments or leaderboard entries.

Admins review both the sandboxed quiz and plain-text source. The initial source excerpt is 200 KiB, with “load more”. A worker scans for risky patterns including fetch, XMLHttpRequest, WebSocket, eval, cookies, and parent/top access. Warnings do not automatically reject a quiz. Parent access is also used by the optional result protocol, so human review is necessary.

Published source is cached per immutable version ID using the Cache API. Drafts are not reused from that cache. Unpublish/delete notifications evict affected version entries; fresh access checks run before opening cached HTML. All entries clear on sign-out, detected expiry, or account switch. Do not prefetch HTML before a quiz is opened.

**Sandboxing reduces risk but does not make uploaded code safe.** There is no malware scanning or end-to-end encryption. Members can inspect answers in client-scored quizzes; that is intentional for self-study.

## Deploy the runner from GitHub

Import the same GitHub repository into a separate Vercel project with Root
Directory `runner`, Framework Other, and the checked-in build command
`node build.mjs --vercel`. Leave the output-directory override unset. Set
`APP_ORIGIN` in the runner's Production environment to its matching main app's
exact HTTPS origin. The cloud build generates its own `.vercel/output` with the
correct parent-origin CSP; no local header preparation/upload is required.

Set the runner's actual origin in the app project's `VITE_QUIZ_RUNNER_ORIGIN`.
The app's cloud build generates its frame policy from that value. Never use the
app's own origin for the runner. Use separate development/production project
pairs and matching branches. Test hosting protection with a normal invited
member so an external hosting login does not prevent iframe access.

Follow [the browser-only deployment guide](GITHUB-DEPLOYMENT.md) for all settings.
Browser smoke tests build disposable fixtures and a separate HTTPS test runner
without modifying either tracked Vercel configuration. They verify storage,
network, top-navigation and forged-message isolation under real response CSP.
