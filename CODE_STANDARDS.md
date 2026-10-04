# Code Standards

## Strict YAGNI

**You Aren't Gonna Need It is the default decision rule, not an aspiration.**
Build only what an explicitly requested feature or a demonstrated correctness
bug needs today. Possible future usefulness is not sufficient justification.

Before adding code, ask:

1. Which current requirement or observed failure does this solve?
2. Can the existing code solve it with a smaller, direct change?
3. What new state, dependencies, contracts, or maintenance does it introduce?

If the first answer is speculative, do not implement it. If the change is larger
than the need, reduce it or discuss the tradeoff before proceeding.

## Keep the toy small

- Prefer straightforward functions and ordinary control flow over frameworks,
  class hierarchies, generic adapters, and configurable strategies.
- Extract a helper when it clarifies current behavior or removes meaningful
  duplication—not to create an extension point for a hypothetical second use.
- Add options only for an actual requested choice. Prefer one documented path
  over multiple modes that no one needs.
- Keep runtime dependencies at zero. Do not add tooling, build steps, generated
  code, or package migrations as incidental cleanup.
- Do not add persistence, durable job registries, distributed locks, retry
  infrastructure, notification deduplication, or remote-server support without
  a concrete requirement. Document the current limits instead.
- Avoid unrelated refactors and cosmetic churn. A bug fix is not permission to
  redesign the plugin.

## Small does not mean incorrect

YAGNI does not excuse wrong results, hidden failures, unsafe side effects, or
ignoring cancellation. Fix demonstrated problems with the simplest adequate
solution.

- Use evidence from the API to determine completion; do not invent correlation
  guarantees it does not expose. Prefer explicit `ambiguous`, `untracked`, or
  timeout results over a plausible but misattributed response.
- Keep deadlines bounded across the work they promise to cover.
- Keep foreground calls and detached background observers' lifetimes explicit.
  Clean up plugin-owned observers when the plugin unloads.
- Validate public inputs at the boundary using the existing schemas. Avoid
  layers of defensive checks for impossible internal states, but handle real
  API failures and externally supplied data.
- Do not swallow errors or add fallbacks that make an unsupported setup appear
  successful. Unsupported behavior should be clear in results or documentation.
- Preserve existing contracts unless changing them is necessary and agreed.

## Style and verification

Use the repository's plain JavaScript ES module style: two-space indentation,
double quotes, and no semicolons. Prefer descriptive names and comments explaining
non-obvious reasoning, constraints, or lifecycle decisions—not restating code.

Preserve and run the existing tests when relevant. Add no new tests unless the
user explicitly requests them; do not impose coverage targets or new test
infrastructure. Use syntax checks and authorized manual checks where appropriate,
and be honest about what remains unverified.

Keep documentation proportional: explain actual behavior, usage, and limitations.
Do not document speculative APIs or promise production-grade guarantees.

**Done means the requested behavior works, relevant checks pass, and the change
remains small—not that every conceivable edge case has acquired infrastructure.**
