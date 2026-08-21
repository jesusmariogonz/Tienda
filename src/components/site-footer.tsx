import { appName } from "@/lib/config";

// Also doubles as breathing room at the bottom of every page so the fixed
// WhatsApp button/popup doesn't sit directly on top of the last button on
// the page (e.g. "Comprar ahora"). Términos y condiciones / Aviso de
// privacidad links go here once they exist.
export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-zinc-100 px-4 py-10 text-center text-xs text-zinc-400 sm:px-6">
      <p>
        © {new Date().getFullYear()} {appName}. Todos los derechos reservados.
      </p>
    </footer>
  );
}
