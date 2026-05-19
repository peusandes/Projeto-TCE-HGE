"use client";

import { useState, useTransition, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marcarOnboarded } from "@/app/(app)/onboarding-actions";
import { cn, errMsg } from "@/lib/utils";
import { toast } from "sonner";
import {
  IllusWelcome,
  IllusPlantao,
  IllusPaciente,
  IllusAnexos,
  IllusGose,
  IllusOffline,
  IllusReady,
} from "./illustrations";

type Step = {
  illus: React.ReactNode;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  /** Hex base pra glow do step — combina com a ilustração */
  accent: "cobalt" | "saffron" | "moss" | "violet";
};

function getSteps(nomePesquisador: string): Step[] {
  const primeiroNome = nomePesquisador.trim().split(/\s+/)[0] || "pesquisador";
  return [
    {
      illus: <IllusWelcome />,
      eyebrow: "Bem-vindo",
      title: `Olá, ${primeiroNome}.`,
      body: (
        <>
          Esse é o sistema de coleta TCE da <strong className="text-ink">LANC</strong> — substitui
          o Excel do plantão e alimenta o REDCap 3.0. Em 6 telinhas você vai entender como
          tudo conversa.
        </>
      ),
      accent: "cobalt",
    },
    {
      illus: <IllusPlantao />,
      eyebrow: "Tela 1 · Plantões",
      title: "Cada noite vira um plantão",
      body: (
        <>
          Você cria um plantão (data + pesquisadores), adiciona pacientes no mapa por setor,
          e finaliza ao sair do HGE. <strong className="text-ink">O próximo plantão clona
          automaticamente</strong> só os que ainda estão internados — sem retrabalho.
        </>
      ),
      accent: "cobalt",
    },
    {
      illus: <IllusPaciente />,
      eyebrow: "Tela 2 · Paciente",
      title: "Três abas, um paciente",
      body: (
        <>
          <strong className="text-ink">Resumo</strong> tem situação, leito, TCLE.
          {" "}<strong className="text-ink">REDCap</strong> tem os 11 instrumentos do
          protocolo (mesmo do REDCap oficial). <strong className="text-ink">Anexos</strong> é
          onde mora a magia.
        </>
      ),
      accent: "cobalt",
    },
    {
      illus: <IllusAnexos />,
      eyebrow: "O segredo do plantão",
      title: "Fotografe agora, transcreva depois",
      body: (
        <>
          Tire foto do <strong className="text-ink">HGT</strong>, da escala de Glasgow, do
          prontuário inteiro. Marque o tipo. Em casa, com calma, você abre as fotos e
          preenche o REDCap. <strong className="text-ink">Funciona offline</strong> — sobe
          quando reconectar.
        </>
      ),
      accent: "saffron",
    },
    {
      illus: <IllusGose />,
      eyebrow: "Follow-up",
      title: "GOS-E: 30, 90 e 180 dias",
      body: (
        <>
          O sistema calcula a partir do trauma e <strong className="text-ink">avisa no
          plantão do dia</strong>. Você liga, registra o GOS-E. Se não atender, marca{" "}
          <em>&ldquo;tentei ligar&rdquo;</em> — fica pendente até concluir.
        </>
      ),
      accent: "saffron",
    },
    {
      illus: <IllusOffline />,
      eyebrow: "Sem medo de cair internet",
      title: "Offline-first de verdade",
      body: (
        <>
          Sinal ruim no HGE? Continua usando normal. As mudanças ficam numa fila local e
          sobem sozinhas quando você reconecta. <strong className="text-ink">Um badge no
          topo</strong> mostra se tem coisa pendente.
        </>
      ),
      accent: "violet",
    },
    {
      illus: <IllusReady />,
      eyebrow: "Tudo pronto",
      title: "Bom plantão!",
      body: (
        <>
          Você sempre pode rever esse tour no <strong className="text-ink">Manual</strong>.
          Em caso de dúvida sobre o protocolo, chama o Dr. Davi ou um senior da LANC.
        </>
      ),
      accent: "moss",
    },
  ];
}

const ACCENT_CLASSES = {
  cobalt: {
    glow: "from-cobalt/10 via-paper-deep to-paper-deep",
    chip: "bg-cobalt/10 text-cobalt-soft border-cobalt/25",
    dot: "bg-cobalt",
  },
  saffron: {
    glow: "from-saffron/10 via-paper-deep to-paper-deep",
    chip: "bg-saffron/10 text-saffron border-saffron/25",
    dot: "bg-saffron",
  },
  moss: {
    glow: "from-moss/10 via-paper-deep to-paper-deep",
    chip: "bg-moss/10 text-moss border-moss/25",
    dot: "bg-moss",
  },
  violet: {
    glow: "from-violet-600/10 via-paper-deep to-paper-deep",
    chip: "bg-violet-600/10 text-violet-600 border-violet-600/25",
    dot: "bg-violet-600",
  },
} as const;

type Props = {
  nomePesquisador: string;
  /** Se true, render mesmo quando já completou — pra link "Ver de novo" no /manual */
  forced?: boolean;
  onClose?: () => void;
};

export function OnboardingTour({ nomePesquisador, forced = false, onClose }: Props) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [pending, startTransition] = useTransition();

  const steps = getSteps(nomePesquisador);
  const total = steps.length;
  const isFirst = step === 0;
  const isLast = step === total - 1;
  const current = steps[step];
  const accent = ACCENT_CLASSES[current.accent];

  // Trava scroll do body enquanto modal aberto
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  function next() {
    if (isLast) return finish(true);
    setDirection("forward");
    setStep((s) => Math.min(total - 1, s + 1));
  }

  function back() {
    setDirection("back");
    setStep((s) => Math.max(0, s - 1));
  }

  function finish(navigateToPlantoes: boolean) {
    if (forced) {
      // Modo "ver de novo" — não persiste nada, só fecha
      setOpen(false);
      onClose?.();
      return;
    }
    startTransition(async () => {
      try {
        await marcarOnboarded();
        setOpen(false);
        onClose?.();
        // Hard navigation pra evitar stale CSS hash em dev (revalidatePath
        // invalida o layout enquanto router.push ainda usa referências antigas)
        window.location.href = navigateToPlantoes ? "/plantoes" : window.location.pathname;
      } catch (err) {
        toast.error("Erro ao salvar progresso", { description: errMsg(err) });
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className={cn(
          "relative w-full sm:w-[440px] sm:max-w-[92vw] h-[100svh] sm:h-auto sm:max-h-[88svh] sm:rounded-2xl",
          "bg-paper-deep overflow-hidden flex flex-col",
          "sm:border sm:border-hairline sm:shadow-2xl",
        )}
      >
        {/* Gradient atmosférico atrás da ilustração */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b pointer-events-none transition-colors duration-500",
            accent.glow,
          )}
        />

        {/* Header — skip + progress */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  i === step
                    ? `${accent.dot} w-6`
                    : i < step
                      ? "bg-ink/60 w-3"
                      : "bg-hairline w-3",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => finish(false)}
            disabled={pending}
            aria-label="Fechar tutorial"
            className="size-8 rounded-md flex items-center justify-center text-ash hover:text-ink hover:bg-paper-soft transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* Step content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-7 pt-4">
          <div
            key={step}
            className={cn(
              "flex flex-col gap-5",
              direction === "forward" ? "animate-slide-in-r" : "animate-slide-in-l",
            )}
          >
            {/* Ilustração */}
            <div className="aspect-[280/180] w-full max-w-[360px] mx-auto">
              {current.illus}
            </div>

            {/* Eyebrow */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-editorial font-semibold",
                  accent.chip,
                )}
              >
                <Sparkles className="h-2.5 w-2.5" strokeWidth={2.2} />
                {current.eyebrow}
              </span>
              <span className="text-[10px] tab-num font-mono text-ash">
                {String(step + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>

            {/* Title + body */}
            <div className="space-y-3">
              <h2
                id="onboarding-title"
                className="text-[24px] sm:text-[26px] leading-tight font-semibold text-ink tracking-tight"
              >
                {current.title}
              </h2>
              <p className="text-[14px] leading-relaxed text-graphite">{current.body}</p>
            </div>
          </div>
        </div>

        {/* Footer — nav */}
        <div className="relative z-10 px-4 sm:px-5 pb-5 pt-4 border-t border-hairline bg-paper-deep/95 backdrop-blur safe-bottom">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={back}
              disabled={isFirst || pending}
              className={cn(
                "h-12 px-3 text-graphite hover:text-ink",
                isFirst && "opacity-0 pointer-events-none",
              )}
            >
              <ChevronLeft className="h-4 w-4 mr-1" strokeWidth={1.8} />
              Voltar
            </Button>
            <div className="flex-1" />
            <Button
              size="lg"
              onClick={next}
              disabled={pending}
              className="h-12 px-5 min-w-[140px] bg-ink text-paper hover:bg-graphite shadow-sm"
            >
              {isLast ? (
                pending ? "Salvando..." : "Ir pros plantões"
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" strokeWidth={1.8} />
                </>
              )}
            </Button>
          </div>
          {!isLast && !forced && (
            <button
              type="button"
              onClick={() => finish(false)}
              disabled={pending}
              className="mt-3 w-full text-center text-[11px] text-ash hover:text-graphite transition-colors"
            >
              Pular tutorial — ver depois no manual
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
