import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({
    mode: "mock",
    message: "Open banking sync endpoint scaffolded. Wire this to PNZ token storage and account sync next.",
    synced: {
      accounts: 2,
      balances: 2,
      transactions: 18
    }
  });
}
