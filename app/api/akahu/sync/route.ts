import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({
    mode: "akahu",
    message: "Akahu sync endpoint scaffolded. Wire this to persistent token storage and background refresh jobs next.",
    synced: {
      accounts: 2,
      balances: 2,
      transactions: 18
    }
  });
}
