// Gate de rotas /admin/* — proteção principal é no middleware.
// Aqui apenas garantimos que se um RSC for renderizado fora do middleware,
// ainda verificamos no servidor.
import { redirect } from "next/navigation";
import { getCurrentPesquisador } from "@/lib/data/pesquisadores";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentPesquisador();
  if (!me?.is_admin) redirect("/plantoes");
  return <>{children}</>;
}
