# Releasing

Releases are **version-driven** and cut automatically by GitLab CI. Tags and
GitHub Releases live on the **public GitHub mirror**; the GitLab source stays
tagless by design.

## Cut a release

1. On `develop`, bump `version` in `package.json` (SemVer: feature = minor,
   fix = patch).
2. Add a dated section to `CHANGELOG.md`:

   ```
   ## [1.11.0] - 2026-08-05

   ### Added
   - …
   ```

   The date must be a real date, **not** `Unreleased` — the release job skips a
   version whose section is marked Unreleased.
3. Merge `develop` → `master` and push both.

On the `master` push, CI:

- `mirror_to_github` — force-pushes a scrubbed copy to the GitHub mirror.
- `release_to_github` — reads `version` from `package.json`, and if no GitHub
  Release `vX.Y.Z` exists yet, creates the annotated tag **on GitHub** and a
  Release whose body is the matching `CHANGELOG.md` section. Idempotent: if the
  release already exists it does nothing.

That's the whole flow — no manual `gh release` / `git tag` needed for normal
releases.

## Rules

- **Never push tags to the GitLab source.** The `build` / `deploy` jobs have no
  ref restriction, so a tag push there can fire a real deploy. Tags belong on
  GitHub only (the CI puts them there).
- Keep `package.json` `version` and the top dated `CHANGELOG.md` section in sync
  — they are the single source of truth the release job reads.

## Backfilling historical releases (one-off)

CI only releases the *current* `package.json` version at `HEAD`, so historical
milestones must be tagged by hand — directly on the GitHub mirror (never
GitLab), oldest first:

1. Create a **backdated annotated tag** at the milestone commit via the GitHub
   API so the tag date reads correctly:

   ```bash
   printf '{"tag":"v1.2.0","message":"Release v1.2.0","object":"<full-sha>","type":"commit","tagger":{"name":"…","email":"…","date":"<commit ISO date>"}}' \
     | gh api repos/<owner>/<repo>/git/tags --input -            # → tag object sha
   gh api repos/<owner>/<repo>/git/refs -f ref=refs/tags/v1.2.0 -f sha=<tag-object-sha>
   ```

2. Create the Release from the CHANGELOG section, `--latest=false` on every one
   except the newest (which takes the Latest badge):

   ```bash
   gh release create v1.2.0 -R <owner>/<repo> --title "v1.2.0 — …" \
     --notes-file body.md --latest=false --verify-tag
   ```

GitHub's `published_at` is set at creation time and is not writable, so
backfilled releases read as published today — the **CHANGELOG date is the
authoritative record**, and the tag date is backdated as above.
