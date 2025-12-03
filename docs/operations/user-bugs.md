# User-Reported Bugs

This file tracks bugs reported by users (external). For internal bugs discovered during development, see `bug-tracker.md`.

---

## Bug ID Format
User bugs use the format: `UB-YYMMDD-NN` (e.g., UB-251129-01)
- `UB` = User Bug (distinguishes from internal bugs)
- `YYMMDD` = Date reported
- `NN` = Sequential number for that day

## Status Legend
- **Open** - Bug confirmed, not yet fixed
- **In Progress** - Actively being worked on
- **Fixed** - Fix applied, pending verification
- **Verified** - Fix confirmed working in production
- **Won't Fix** - Not a bug or by design

---

## Active Bugs

*(No active bugs)*

---

## Resolved Bugs

### UB-251129-01: Media stuck in temp folder - not visible to other users

**Status:** Verified
**Reported:** 2025-11-29
**Resolved:** 2025-12-03
**Reporter:** Jason Leake
**Priority:** Critical
**Branch:** userbugs-112905

### User Report
> Created a collection "luggage" with two artifacts. Added pictures to each artifact. User can see the pictures inside the artifacts, but other users cannot see them. Thumbnails visible on artifact cards but not collection. Media confirmed still in Supabase temp folder.

### Affected URLs
- Collection: https://heirloomsapp.com/collections/luggage?mode=all
- Artifact 1: https://heirloomsapp.com/artifacts/roll-aboard-1764427863997
- Artifact 2: https://heirloomsapp.com/artifacts/my-backpack-1764425754823

### Root Cause
**Two issues combined:**

**Issue 1: Files stuck in temp folder**
`updateArtifact()` in `lib/actions/artifacts.ts` was missing the call to `reorganizeArtifactMedia()`.

**Issue 2: RLS policy on user_media table**
RLS policies only allowed the owner to read their `user_media` records, blocking gallery display for other users.

### Fix Applied

1. **Code change** - Added `reorganizeArtifactMedia()` call to `updateArtifact()`
2. **RLS policy** - Added SELECT policy allowing public read for media linked to artifacts
3. **Migration script** - Moved existing temp folder media to artifact folders

### Resolution
- All verification steps completed
- User (Jason) confirmed fix working in production

See: `docs/archive/2025-11-30-temp-media-reorganization-fix.md`

---

## Bug Template

When adding a new user bug, use this template:

```markdown
## UB-YYMMDD-NN: [Brief Title]

**Status:** Open | In Progress | Fixed | Verified | Won't Fix
**Reported:** YYYY-MM-DD
**Reporter:** [User identifier or "Anonymous"]
**Priority:** Critical | High | Medium | Low
**Branch:** [fix branch name if applicable]

### User Report
> [Exact user description, quoted]

### Steps to Reproduce
1. Step one
2. Step two
3. ...

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Environment
- Device: [if known]
- Browser: [if known]
- OS: [if known]

### Investigation Notes
[Developer notes during investigation]

### Root Cause
[Once identified]

### Fix Applied
**Files Modified:**
- `path/to/file.ts` - [brief description]

**PR/Commit:** [link or hash]

### Verification
- [ ] Fix tested locally
- [ ] Fix deployed to staging
- [ ] User confirmed fix (if applicable)
- [ ] Fix deployed to production
```

---

## Integration with Development

### Workflow
1. User reports bug via feedback channel
2. Create entry in this file with `Open` status
3. Create branch: `userbugs-MMDDNN` (e.g., `userbugs-112901`)
4. Update status to `In Progress`
5. Document investigation in bug entry
6. Apply fix, update status to `Fixed`
7. After production deployment and verification, update to `Verified`
8. Move to Resolved Bugs section

### Cross-Referencing
- If a user bug relates to an internal bug, note it: "See also: [bug-tracker.md#section-name]"
- If fix documentation is extensive, add to `bug-tracker.md` and reference: "Details: [bug-tracker.md#section-name]"
