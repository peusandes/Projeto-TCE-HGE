import { getCurrentPesquisador } from "@/lib/data/pesquisadores";
import { OnboardingTour } from "./OnboardingTour";

/**
 * Mount no (app) layout: busca o pesquisador, decide se mostra o tour.
 * Falha silenciosa — se a query quebrar (ex: coluna onboarded_at ainda não
 * foi criada via migration 0015), o tour não aparece, mas o app continua.
 */
export async function OnboardingMount() {
  try {
    const me = await getCurrentPesquisador();
    if (!me) return null;
    if (me.onboarded_at) return null;
    return <OnboardingTour nomePesquisador={me.nome ?? ""} />;
  } catch {
    return null;
  }
}
