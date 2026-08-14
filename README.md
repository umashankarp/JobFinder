# Job Finder

A single-file page that pulls the latest job postings from several open job boards at once,
merges and de-duplicates them, sorts newest-first, and scores each posting against a role
keyword or your pasted resume. No build step, no server, no API keys.

## Run it

Double-click `index.html`. That's it — all five boards currently accept requests from
`file://` pages.

If a source reports "unavailable," double-click `serve.cmd` instead and use
<http://localhost:8000>. It serves the folder over HTTP (via Python or Node, whichever
you have), which resolves the browser-origin restrictions some APIs apply.

## Live sources

| Source | Coverage | Notes |
| --- | --- | --- |
| Remotive | Remote, keyword-searchable | Date-sorted |
| Arbeitnow | Europe-heavy, remote + on-site | Date-sorted, highest volume |
| RemoteOK | Remote, tech-heavy | Date-sorted |
| Jobicy | Remote, keyword-searchable | Date-sorted |
| The Muse | On-site + remote, large employers | **No date-sorted feed** — pages 1–3 are sampled, then cut by your "posted within" filter |

Everything else (LinkedIn, Indeed, Glassdoor, Naukri, Google Jobs, Wellfound, ZipRecruiter,
Monster, Dice, We Work Remotely, SimplyHired, Otta) appears as a pre-filled search link.
Those sites prohibit automated scraping in their terms of service, so the page links into
their own search rather than pulling their listings.

Sources that were evaluated and rejected: **Himalayas** (sends no CORS header; its bot
protection also 522s public proxies), **WorkingNomads** (no CORS header), **Landing.jobs**
(no company field, newest posting over a year stale).

## How matching works

- **Keyword mode** — type a role. The full phrase gets the highest weight, individual
  words less.
- **Resume mode** — paste a resume. It extracts up to 20 weighted keywords (known skill
  phrases, repeated bigrams, then single terms minus stopwords) and infers a role title
  from the header lines. The resume text stays in the browser; only the short role
  keyword is ever sent to a job board.

A hit in the title or tags counts full weight; one buried in the body counts 0.6. Scores
are then rescaled against the best result in the set, so **100 means "best available
match," not "perfect."**

## Ordering

"Posted within" bounds how recent the results are; **Sort by** then orders what's left.

- **Best match** (default) — score descending, fresher first on ties. Match numbers
  descend monotonically down the page.
- **Best match, aged down** — score minus ~1.6 points per day of age (capped at 30 days),
  so a strong match from yesterday outranks a mediocre one from this morning. Useful with
  a wide date window. It can seat a 91 above a 100, which is correct but reads oddly —
  hence not the default.
- **Newest first** — strict date order. Same-day postings carry no meaningful cross-board
  time order, so each day is ranked by match quality internally, and sources are
  round-robined among equal scores so one high-volume board can't own the page.

"Only show postings that match my keywords" is a precision filter: a multi-word query
needs two of its terms in the title/tags, and body-only matches need real overlap. Untick
it to see everything the boards returned.

Within a single day the posting order across boards is arbitrary, so results are
round-robined by source inside each day — still newest-first, but one high-volume board
can't bury the other four.

## Settings persistence

Resume, filters and toggles are saved to `localStorage`. Untick "Remember my resume on
this device" to keep the resume out of storage, or hit **Reset** to clear everything.

## test-pipeline.js

Runs the page's real fetch/map/score/filter/sort code in Node against the live APIs using
a DOM shim, so upstream API drift shows up as a failing source or an empty result set:

```
node test-pipeline.js "software engineer" "" 7
node test-pipeline.js "data analyst" "" 7 remote
node test-pipeline.js "" "" 30 "" "$(cat resume.txt)"
```

Arguments: `query`, `location`, `posted-within-days`, `remote`, `resume-text`. It reports
per-source counts, the source mix, and flags malformed URLs or missing titles.

## Known limits

These boards skew remote and tech. Non-tech, location-specific searches (e.g. "registered
nurse" in a given city) will return little or nothing inline — that's what the portal
search links are for.
