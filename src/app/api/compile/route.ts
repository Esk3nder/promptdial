import { NextResponse } from "next/server";

/**
 * POST /api/compile
 *
 * The compilation pipeline runs client-side because it depends on
 * IndexedDB for artifact storage. This route exists as documentation
 * and returns a 501 directing callers to use the client-side compile()
 * function from @/compiler/pipeline instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Compilation runs client-side. Import compile() from @/compiler/pipeline.",
      hint: "Artifacts are stored in IndexedDB which is only available in the browser.",
    },
    { status: 501 }
  );
}
