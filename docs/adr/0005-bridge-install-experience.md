# ADR-0005 — Bridge install experience (the simplest first-run we can honestly ship)

- **Status:** accepted (planning, 2026-06-13). Extends ADR-0004 (distribution & local
  surface). Author: Fable; build orchestrated to Sonnet.
- **Goal:** a first-time, non-technical-friendly install of the Bridge daemon — as close
  to "one command, then approve in the browser" as the no-signing-cert reality allows.

## Context

ADR-0004 shipped the CLI, click-to-pair, and a packaged Node-SEA binary + minimal tray.
But the *install* a first-timer faces today is rough: find an 89 MB unsigned `.exe`, get
past a SmartScreen scare, put it somewhere, register auto-start, then pair. Onkesh's ask:
make this dead simple and un-confusing. Two hard realities bound what "simple" can mean:

1. **No code-signing cert yet.** Any unsigned binary triggers SmartScreen (Windows) /
   Gatekeeper (macOS). We cannot make that warning disappear without the cert — but we
   CAN make it *expected* instead of *scary* by explaining it in-flow.
2. **Cross-platform binaries can't be built on the Owner's Windows box** (mac/linux need
   their own hosts). So binaries must be produced by CI, not locally.

## Decisions

### 1. CI builds and publishes the binaries (solves the cross-platform gate)
A **GitHub Actions release workflow** (`.github/workflows/bridge-release.yml`) triggers on
a `bridge-v*` tag, builds the Node-SEA binary on `windows-latest`, `macos-latest`, and
`ubuntu-latest` runners (each runs `scripts/build-sea.mjs`), and attaches all three to a
GitHub Release. This is the keystone: the runners build what the Owner's machine can't,
and the Release is the stable download home (GitHub Releases handle large binaries; Vercel
static hosting does not). Signing slots in here later as CI secrets (§4) with zero workflow
restructure.

### 2. A one-command install script per OS (the "simple" surface)
`install.ps1` (Windows) and `install.sh` (macOS/Linux), each: detect platform/arch →
download the matching binary from the latest GitHub Release → place it
(`%LOCALAPPDATA%\Atlas\` / `~/.local/bin`) → register the login-item via the existing
service registrars → run `atlas-bridge pair`. The whole install is then:

```
# Windows
irm https://<atlas>/install.ps1 | iex
# macOS / Linux
curl -fsSL https://<atlas>/install.sh | sh
```

Atlas SERVES these scripts (they are tiny text, safe on Vercel) from `/install.ps1` and
`/install.sh` (a route that returns the script with the instance's own URL interpolated,
so the downloaded daemon already knows which Atlas to pair with). The binaries come from
GitHub Releases; the scripts come from Atlas — each hosted where it belongs.

### 3. The in-app first-run turns the scary step into an expected one
`/settings/bridges` (unpaired state) leads with the copy-one-line install command and a
download fallback, and — critically — names the SmartScreen step honestly BEFORE the user
hits it: "Windows will say it doesn't recognise this app. That's expected — we haven't
bought a signing certificate yet. Click **More info → Run anyway**." A confused first-timer
who was warned is no longer confused. The richer cockpit (runs, doctor) stays in Atlas per
ADR-0004 §2 — the install surface only handles getting connected.

### 4. Signing is the one gate that removes the last friction — and it's the Owner's
Once the Owner has a Windows cert + Apple Developer ID, they go into the CI as encrypted
secrets and the release workflow signs/notarizes in place; the §3 SmartScreen copy is then
deleted. Until then, unsigned-but-explained is the honest shippable state. Documented, not
faked.

## Consequences

- The one-liner depends on (a) the repo being on GitHub and (b) a published Release. Both
  are Owner steps (push the repo; cut the first `bridge-v*` tag). The scripts + workflow
  are authored ready; they activate when those exist. Until then, the in-app flow offers
  the direct binary download as the fallback path, and `atlas-bridge` from source works for
  the developer (Owner) immediately.
- An end-user doc (`/docs/connect-your-machine`) walks the whole thing with the honest
  SmartScreen note, so the trust circle has a page to point at.
- No product behavior changes; this is distribution + copy + CI, governed alongside the
  daemon it serves.
