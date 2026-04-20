import { json } from "@sveltejs/kit";
const POST = async () => {
  return json(
    {
      error: "Este endpoint foi descontinuado. Use a importação local na tela de Importar Vendas."
    },
    { status: 410 }
  );
};
export {
  POST
};
