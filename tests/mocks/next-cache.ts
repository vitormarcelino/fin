// `revalidatePath` reads Next's per-request static-generation store, which
// only exists while `next dev`/`next start` is handling an actual request or
// action. Under Vitest there is no such store, so it throws an "Invariant"
// error. The actions that call it don't depend on its side effect for
// correctness (cache invalidation isn't something a unit/integration test
// observes), so a no-op is a faithful stand-in here.
export function revalidatePath() {}
export function revalidateTag() {}
