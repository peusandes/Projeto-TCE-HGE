import { redirect } from "next/navigation";
import { getCurrentPesquisador } from "@/lib/data/pesquisadores";
import { AvatarPicker } from "@/components/perfil/AvatarPicker";
import { PerfilForm } from "@/components/perfil/PerfilForm";
import { PasswordChangeForm } from "@/components/perfil/PasswordChangeForm";
import { AdminSection } from "@/components/perfil/AdminSection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Perfil — LANC TCE" };

export default async function PerfilPage() {
  const me = await getCurrentPesquisador();
  if (!me) redirect("/login");

  return (
    <div className="container max-w-2xl py-5 space-y-8">
      <section>
        <h1 className="text-[28px] leading-none font-semibold text-ink">Perfil</h1>
        <p className="mt-2 text-[13px] text-ash">
          Sua conta de pesquisador.
        </p>
      </section>

      {/* Avatar + identidade */}
      <section className="bg-paper-deep border border-hairline rounded-xl p-5 space-y-5">
        <AvatarPicker userId={me.id} avatarUrl={me.avatar_url} />
        <div className="h-px bg-hairline" />
        <PerfilForm initialNome={me.nome ?? ""} email={me.email} />
      </section>

      {/* Senha */}
      <section className="bg-paper-deep border border-hairline rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Senha</h2>
          <p className="text-[11px] text-ash mt-1">
            Use uma senha forte. Mínimo 8 caracteres.
          </p>
        </div>
        <PasswordChangeForm />
      </section>

      {/* Admin */}
      {me.is_admin && <AdminSection />}

      <div className="h-16" aria-hidden />
    </div>
  );
}
