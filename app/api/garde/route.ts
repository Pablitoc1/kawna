import { NextResponse } from "next/server";
import { update } from "@/lib/store";

export async function POST(req: Request) {
  const on = (await req.formData()).get("on") === "1";
  await update((s) => {
    s.garde = on;
  });
  return NextResponse.redirect(new URL("/moi#garde", req.url), 303);
}
