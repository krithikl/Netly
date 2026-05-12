import { defaultTransactionCategories } from "@/lib/categories";

const needsReviewCategory = "Needs review";
const knownCategories = new Set(defaultTransactionCategories.map(normalizeCategory));
const categoryAliases = new Map<string, string>([
  ["cafe", "Eating out"],
  ["cafes", "Eating out"],
  ["cafes & restaurants", "Eating out"],
  ["dining", "Eating out"],
  ["restaurants", "Eating out"],
  ["restaurant", "Eating out"],
  ["takeaways", "Eating out"],
  ["food & drink", "Eating out"],
  ["food and drink", "Eating out"],
  ["supermarkets", "Groceries"],
  ["supermarket", "Groceries"],
  ["grocery", "Groceries"],
  ["petrol", "Fuel"],
  ["gas", "Fuel"],
  ["public transport", "Transport"],
  ["rideshare", "Transport"],
  ["rent", "Housing"],
  ["mortgage", "Housing"],
  ["power", "Utilities"],
  ["electricity", "Utilities"],
  ["internet", "Utilities"],
  ["phone", "Utilities"],
  ["mobile", "Utilities"],
  ["streaming", "Subscriptions"],
  ["subscription", "Subscriptions"],
  ["medical", "Health"],
  ["pharmacy", "Health"],
  ["doctor", "Health"],
  ["clothing", "Shopping"],
  ["retail", "Shopping"],
  ["movies", "Entertainment"],
  ["events", "Entertainment"],
  ["holiday", "Travel"],
  ["air travel", "Travel"],
  ["flights", "Travel"],
  ["account transfers", "Transfers"],
  ["transfer", "Transfers"],
  ["bank fees", "Fees"],
  ["fee", "Fees"],
  ["salary", "Income"],
  ["wages", "Income"],
  ["payroll", "Income"]
]);

// Maps bank/provider category labels into Netly’s supported category set.
export function mapSourceCategoryToNetlyCategory(category: string | undefined) {
  const normalizedCategory = normalizeCategory(category);

  if (!normalizedCategory) {
    return needsReviewCategory;
  }

  if (knownCategories.has(normalizedCategory)) {
    return getDefaultCategoryByNormalizedName(normalizedCategory);
  }

  return categoryAliases.get(normalizedCategory) || needsReviewCategory;
}

function getDefaultCategoryByNormalizedName(normalizedCategory: string) {
  return defaultTransactionCategories.find((category) => normalizeCategory(category) === normalizedCategory) || needsReviewCategory;
}

function normalizeCategory(category: string | undefined) {
  return (category || "").trim().toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ");
}
