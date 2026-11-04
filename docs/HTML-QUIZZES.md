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

## Deploy the runner

The second Vercel project uses repository root directory `runner`, output `dist`, and build command `node build.mjs --check`. It needs no package dependencies. Before creating a deployment, run from the repository root with its exact parent origin:

```sh
APP_ORIGIN=https://YOUR_APP.vercel.app node runner/build.mjs
```

Commit/use that prepared `runner/vercel.json` and set the same `APP_ORIGIN` in the runner's Vercel environment. Set `VITE_QUIZ_RUNNER_ORIGIN` in the app, regenerate app headers before deployment, and rebuild. Never use the app's origin for the runner. Distinct development/production parent origins need matching prepared runner configuration. Preview deployments must have their own approved parent origins/access restrictions.

Automated smoke tests produce separate setup/fixture artifacts and runner test headers without rewriting deployment configuration. They serve the app and runner on separate local origins with actual CSP response headers, and verify storage, network, top-navigation, and forged-message isolation.
