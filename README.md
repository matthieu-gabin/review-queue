# review-queue: Paseo plugin

The open pull requests waiting for your review in one GitHub repository, as a sidebar entry with a count and a screen listing them.

- Sidebar entry **Reviews to do** with the number of pull requests; the screen is also in the command center
- Each row: number, title, author, branch, +/− lines, files, checks (✓ ✗ ●), labels, age; tags for Draft, Conflicts, Approved, Changes requested
- Click a row to review it: the pull request is checked out into a Paseo worktree of the **review checkout** (Settings → Review queue, default `~/Documents/repository/paseos-roger/roger-platform-review`), a clone kept apart from the one you develop in; Paseo registers it as a project on first use. A worktree already on that pull request is reused, a Claude agent starts there with `/pr-review <number>`, and the workspace opens. The **pr-review** plugin (`../pr-review`) ships that skill and opens its Review panel on that workspace; without it the agent has no `/pr-review` to run
- **GitHub ↗** on a row opens the pull request in the browser; click the repository name to open the same search on GitHub
- Label chips under the header filter the list: select one or more (for example `java`) to keep only the pull requests carrying any of them; the sidebar count follows. The choice lasts until Paseo restarts
- Refreshes every two minutes, and on **Refresh**
- Settings → Review queue: the repository (`owner/name`, default `rogerhrgeneva/roger-platform`) and **Hide drafts**

"Waiting for your review" is GitHub's `review-requested:@me` on open pull requests: direct requests and requests to a team you belong to. Submitting a review clears the request, so a reviewed pull request leaves the list until the author asks again.

## Requirements

- Paseo >= 0.12.0 with plugins enabled: Settings → Plugins → Enable plugins
- Node.js and npm
- `gh` signed in (`gh auth status`)
- A clone of the repository at the review checkout path (`git clone git@github.com:rogerhrgeneva/roger-platform.git roger-platform-review`)
- The pr-review plugin, for the review itself

## Install

```bash
cd ~/Documents/repository/review-queue   # or wherever this checkout is
npm install
npm run typecheck
paseo plugin install "$PWD"
paseo plugin ls        # review-queue must be "running"
```

## Update / debug

- After editing: `paseo plugin reload review-queue`
- Logs: `paseo plugin logs review-queue`
- The GitHub query lives in `server/github.ts`; the page size is 50, the rest is counted as "more on GitHub"
