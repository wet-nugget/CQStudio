# Cookies and browser storage

The canonical, rendered inventory lives in `src/lib/storage.ts` and is shown on `/storage`. All active uses are classified strictly necessary for the requested workspace. There are no advertising, analytics, or tracking cookies. No service worker or optional offline mode is installed.

| Name | Medium | Purpose | Lifetime | Classification |
| --- | --- | --- | --- | --- |
| `cqstudio.auth` | localStorage | Supabase session and refresh token | Sign-out, detected expiry, account switch | Strictly necessary |
| `cqstudio.auth-code-verifier` | localStorage | Auth PKCE verifier if supplied by Supabase | Auth exchange or cleanup | Strictly necessary |
| `cqstudio.owner` | localStorage | Prevent cached data appearing after an account switch | Cleanup | Strictly necessary |
| `cqstudio.theme` | localStorage | Light/dark/system choice | Cleanup | Strictly necessary |
| `cqstudio.storage-notice` | localStorage | Dismiss necessary-storage notice | Cleanup | Strictly necessary |
| `cqstudio.user.<user>.ui` | localStorage | Theme, density, sidebar collapse, last class and tab (mock preview uses `preview`) | Cleanup | Strictly necessary |
| `cqstudio.user.<user>.attempt.<version>` | localStorage | Quiz answers, flags, shuffled order, deadlines (local preview uses version `preview`) | Submission, discard, cleanup | Strictly necessary |
| `cqstudio.user.<user>.draft.<kind>.<id>` | localStorage | Content and unsent chat recovery | Send, discard, cleanup | Strictly necessary |
| `cqstudio-quiz-html`, keyed by version ID | Cache API | Opened HTML quiz source | Unpublish, delete, cleanup | Strictly necessary |
| Query cache | Memory | Authenticated data reuse | Close tab or cleanup | Strictly necessary |
| sessionStorage | Not currently used | CQStudio remnants are cleared defensively | Cleanup | No active use |
| IndexedDB: `cqstudio-quiz-html`, `cqstudio-offline` | Not currently used | Reserved database names, cleared defensively | Cleanup | No active use |
| Service workers | Not installed | Registrations/caches are cleared defensively | Cleanup | No active use |
| Cookies | Not set by app | No active use | N/A | No active use |

`clearUserData` cancels active queries before clearing caches. Account switches preserve only the newly established Auth session while deleting the prior user's state. A blocked IndexedDB deletion prevents access and asks the user to close other tabs. Storage cleanup failures are visible; they must never silently reveal old data.

Remote session revocation is enforced in Postgres by checking the JWT session ID against `auth.sessions`. An offline tab cannot learn about remote revocation until it reconnects. Explicitly sign out on shared devices. The short signed-file URL window remains 60 seconds.

No authenticated API responses may be persisted in a service worker or CDN. Hashed app assets can be cached for a year; entry HTML is `no-cache`. Query freshness is 60 seconds for lists, 10 minutes for lesson/quiz content, 0 for chat/notifications, and 30 seconds for admin stats. User state never appears in static exports.

If optional storage or any third-party script/service is introduced, first update this document, the rendered inventory, and the Privacy Policy. Implement opt-in consent with reject as easy as accept. Do not add a PWA dependency without approval.

The local `/preview` workspace keeps sample content changes only in memory. Reloading resets those sample records. Its quiz answers and unsent chat use the same prefixed draft keys as the real UI under user `preview`, never a real member ID. Appearance and preview drafts are removed by the normal session cleanup.
