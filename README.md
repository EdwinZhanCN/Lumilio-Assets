# Lumilio Assets

Versioned media fixtures for Lumilio Photos demos and end-to-end tests. Binary
media is stored once under `media/` with Git LFS; profiles select stable asset
IDs without copying files.

## Repository contract

- `assets.json` is the catalog: stable ID, path, SHA-256, byte size, MIME,
  expected image metadata, provenance, and license.
- `profiles/smoke.json` is the smallest critical-path set.
- `profiles/e2e.json` is the deterministic test set and contains smoke.
- `profiles/demo.json` is the complete pool and contains e2e.
- Existing bytes and IDs are immutable. A content change is a new asset ID.
- Media files are Git LFS objects. Consumers pin an immutable release tag and
  commit revision; this repository is never embedded as a submodule.
- Git refs are the release authority, while each consumer records its own lock.

## Clone and verify

```sh
git lfs install
git clone <repository-url> Lumilio-Assets
cd Lumilio-Assets
git lfs pull
node scripts/verify.mjs
```

The verifier checks catalog/profile structure, subset relationships, file sizes,
SHA-256 values, missing or uncatalogued media, and required provenance fields.
The same command and `git lfs fsck` run in the repository's CI workflow.

## Add an asset

1. Put the original under `media/` (use a descriptive, stable path).
2. Add a new entry to `assets.json`; never reuse an ID for different bytes.
3. Add the ID to `demo`, and to `e2e` or `smoke` only when the smaller suite
   needs it.
4. Record a redistributable source and license.
5. Run `node scripts/verify.mjs` and confirm `git lfs ls-files` lists the media.

## Release

Asset releases are immutable Git tags named `assets-vMAJOR.MINOR.PATCH`. Verify
the tree, commit catalog/media/profile changes together, create an annotated
tag, and push both the branch and tag. Consumers pin the tag's commit SHA and
the SHA-256 of `assets.json`; see the release procedure in this README's
consumer integration section below.

### Consumer integration

Lumilio Photos owns `assets.lock.json`, which records the selected immutable
tag, revision, profile, and catalog SHA-256. Its explicit reconcile command
fetches that exact revision and only the LFS objects referenced by the selected
profile, then rechecks the catalog and media hashes. Normal Photos checks use
only committed lock state and do not contact this repository.

