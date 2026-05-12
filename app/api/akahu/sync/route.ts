import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({
    mode: "akahu",
    message: "Akahu sync is not implemented. Add encrypted token storage and a background sync privacy model before enabling this endpoint."
  }, { status: 501 });
}
