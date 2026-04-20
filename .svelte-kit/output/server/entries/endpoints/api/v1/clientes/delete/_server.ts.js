import { json } from "@sveltejs/kit";
const DELETE = async () => {
  return json({ error: "Exclusao de cliente desabilitada." }, { status: 403 });
};
export {
  DELETE
};
