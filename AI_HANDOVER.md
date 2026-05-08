Worth memoizing:

Filtered/sorted transactions
If the app filters, searches, categorizes, and sorts transactions on every render, that should be wrapped in useMemo. This is likely the highest-value next target.

Category select options
The category option arrays should be memoized so every row does not receive a newly created array on each render. This matters because memoized rows only skip rerendering if their props stay referentially stable.

Chart category data
The dashboard category totals should be memoized if they are recalculated from all transactions each render.

Card fit calculations
If card recommendations recalculate annual spend/reward estimates from transactions every render, memoize those derived results.

memoize thse too