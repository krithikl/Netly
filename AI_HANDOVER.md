Generate a summary of the codebase and the coding practices ive told you to follow, along with te app description and currnet/future works.



Add an account selector/filter globally
Put a compact account filter in the topbar: All accounts, then each account by name. This should affect dashboard, transactions, budgets, recurring, and card fit.

Add an Accounts overview section
A small dashboard strip showing each account:

name
type
available balance
currency
connection/bank
last refreshed
whether it supports transactions
Make transaction rows clearer
We already show account labels in transaction metadata, but for multiple accounts we should make the account slightly more prominent, maybe a small pill near the category/status.

Separate “spend accounts” from “non-spend accounts”
Kiwisaver, loans, savings, credit cards, and everyday accounts should not all affect card fit/safe-to-spend the same way. Add account inclusion toggles:

Include in dashboard spend
Include in available balance
Include in card fit
Hide from spend insights
Show account capability warnings
For Demo Bank, show: “This account has no transaction data.”
For real accounts, use Akahu attributes to show whether it supports TRANSACTIONS, PAYMENT_FROM, etc.

Default to “All transaction-capable accounts”
This is the best MVP default. It avoids empty charts from KiwiSaver/savings-only accounts and keeps the app useful immediately.

follow this next,




Optimize the css, it seems like hteres a lot of custom components like the custom select and custom inforow. Is this necessary?

Also, the css file is very very large. Are all tehse styles actually needed? Do you recommend it would be better to use a library of components which have the functionality and reduce this sort of manual creation or do you recommend a different approach? I want to make the css and styling way less complex than it currently is, and reduce the amount of classes significantly if it isn't actually needed.

I am debating whether or not to completely wipe the style and start over.

