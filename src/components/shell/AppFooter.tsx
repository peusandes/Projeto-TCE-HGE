/**
 * Crédito discreto do desenvolvedor — fica no rodapé do app, acima do
 * BottomNav. Cor saffron sutil pra não competir com o conteúdo.
 */
export function AppFooter() {
  return (
    <footer className="px-5 pt-2 pb-3 text-center">
      <p className="text-[10px] text-saffron/70 tracking-editorial">
        Desenvolvido por{" "}
        <span className="text-saffron/90 font-medium">Pedro Sandes Pereira</span>{" "}
        · 2026
      </p>
    </footer>
  );
}
