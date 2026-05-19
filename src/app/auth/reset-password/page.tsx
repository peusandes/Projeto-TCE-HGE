import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Redefinir senha — LANC TCE" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pra chegar aqui, o user clicou no link do email, o callback trocou o
  // token por uma sessão de recovery. Se não tem user, link expirou.
  if (!user) {
    redirect("/login?msg=reset_expirado");
  }

  return (
    <div className="min-h-svh flex flex-col bg-paper-grain">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Image
              src="/logo-lanc.png"
              alt="LANC"
              width={84}
              height={84}
              className="rounded-2xl shadow-[0_8px_24px_-12px_rgba(10,22,40,0.4)]"
              priority
            />
            <div className="text-center space-y-2">
              <p className="text-[10px] uppercase tracking-ultra text-ash">Recuperação</p>
              <h1 className="font-display text-[28px] leading-none font-medium text-ink text-balance">
                Nova senha
              </h1>
              <p className="font-display-italic text-[14px] text-graphite">
                {user.email}
              </p>
            </div>
          </div>

          <ResetPasswordForm />

          <p className="mt-6 text-center text-[11px] text-ash leading-relaxed">
            Depois de salvar, você entra direto no app.
          </p>
        </div>
      </div>
    </div>
  );
}
