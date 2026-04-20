import { redirect } from "@sveltejs/kit";
function load() {
  throw redirect(302, "/");
}
export {
  load
};
