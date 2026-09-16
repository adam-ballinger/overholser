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

## Git

Commit straight to `main`. No feature branches, no pull requests - this
history is one straight line on purpose. Branch only when I ask by name.

**Never commit unprompted.** Finish the work, say which files changed, stop.
A dirty working tree is the normal resting state, not something to tidy up.

## Project info

Read `README.md` before starting work. Keep it current when behavior,
conventions or open questions change.
