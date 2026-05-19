import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Bem-vindo — LANC TCE" };
export const dynamic = "force-dynamic";

export default async function SetupAccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pesquisador } = await supabase
    .from("pesquisadores")
    .select("nome, setup_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (pesquisador?.setup_complete) redirect("/plantoes");

  return (
    <div className="min-h-svh flex flex-col bg-paper-grain">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Image
              src="/logo-lanc.png"
              alt="LANC"
              width={68}
              height={68}
              className="rounded-2xl shadow-[0_8px_24px_-12px_rgba(10,22,40,0.4)]"
              priority
            />
            <div className="text-center space-y-2">
              <p className="text-[10px] uppercase tracking-ultra text-ash">Primeiro acesso</p>
              <h1 className="font-display text-[28px] leading-none font-medium text-ink text-balance">
                Bem-vindo<span className="font-display-italic text-ash">,</span>
              </h1>
              <p className="font-display-italic text-[14px] text-graphite">
                Vamos terminar seu cadastro.
              </p>
            </div>
          </div>

          <SetupForm
            email={user.email ?? ""}
            initialNome={pesquisador?.nome ?? ""}
          />

          <p className="mt-6 text-center text-[11px] text-ash leading-relaxed">
            Você só precisa fazer isto uma vez.
          </p>
        </div>
      </div>
    </div>
  );
}
