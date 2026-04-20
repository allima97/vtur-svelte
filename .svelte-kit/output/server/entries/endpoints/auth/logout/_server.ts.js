import { redirect, json } from "@sveltejs/kit";
import "@supabase/ssr";
import "clsx";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
const GET = async ({ locals: { supabase: supabase2 } }) => {
  await supabase2.auth.signOut();
  if (typeof window !== "undefined") {
    await supabase2.auth.signOut();
  }
  throw redirect(302, "/auth/login");
};
const POST = async ({ locals: { supabase: supabase2 } }) => {
  await supabase2.auth.signOut();
  return json({ success: true });
};
export {
  GET,
  POST
};
