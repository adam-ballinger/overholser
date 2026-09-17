# CLAUDE.md

## Asking questions and explaining things to Adam

I'm a beginner. Use plain language, kept short. 

## Keeping the code small

Leanness is a core principle here, keep code conventional but as tiny as possible

- **Build the smallest thing that works.** No abstraction until a second
  caller exists; no file or folder created ahead of need. An empty seam is a
  cost, not a head start.
- **Ask before adding a dependency**, a dev tool, or a config file.
- **Prefer deleting.** A change that removes code is worth proposing.

## Git and versions

Commit straight to `main`. No pull requests - this history is one straight
line on purpose.

**Branching is your call, and the answer is almost always no.** I won't know
when to ask, so don't wait for me. Branch only when the work would be hard to
undo, and say plainly what it's for.

**You decide when to commit, when to push, and how far to raise the version
in `package.json`** (patch, minor, major). Judge it at the time, do it when
you're confident it's right, and tell me afterwards. Don't ask first.

I'll tell you when I'm done with a work session.

**Don't commit, push or raise the version more often than the work deserves.**
A commit per small edit, or a version number raised for its own sake, is
wasted. A dirty working tree is a normal resting state.

## Project info

Read `README.md` before starting work. Keep it current when behavior,
conventions or open questions change.
