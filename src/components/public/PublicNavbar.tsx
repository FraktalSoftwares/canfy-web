import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";

export interface PublicNavLink {
  label: string;
  href: string;
}

interface PublicNavbarProps {
  /** Links centrais. Em âncoras use "/#secao"; em páginas internas use rotas. */
  links?: PublicNavLink[];
}

const DEFAULT_LINKS: PublicNavLink[] = [
  { label: "Home", href: "/" },
  { label: "Funcionalidades", href: "/#funcionalidades" },
  { label: "Plataforma", href: "/#plataforma" },
  { label: "Contato", href: "/#contato" },
];

const PublicNavbar = ({ links = DEFAULT_LINKS }: PublicNavbarProps) => {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border border-primary/20 bg-card-green/70 px-6 py-3 backdrop-blur-md">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Canfy" className="h-7 w-auto" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) =>
            link.href.startsWith("/#") ? (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>

        <div className="flex items-center gap-3">
          <a href="/#contato" className="hidden sm:block">
            <Button
              variant="outline"
              className="rounded-full border-primary text-primary hover:bg-primary/10"
            >
              Entre em contato
            </Button>
          </a>
          <Link to="/entrar">
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover">
              Entrar
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default PublicNavbar;
