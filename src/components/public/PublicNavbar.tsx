import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);

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
          <Link to="/entrar" className="hidden md:block">
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover">
              Entrar
            </Button>
          </Link>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full md:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-card-green/95 flex flex-col gap-8 w-[300px]">
              <Link to="/" className="flex items-center" onClick={() => setMenuOpen(false)}>
                <img src={logo} alt="Canfy" className="h-7 w-auto" />
              </Link>

              <nav className="flex flex-col items-center gap-6 mt-4">
                {links.map((link) =>
                  link.href.startsWith("/#") ? (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="text-base font-medium text-foreground hover:text-primary"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="text-base font-medium text-foreground hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </nav>

              <div className="mt-auto flex flex-col gap-3">
                <SheetClose asChild>
                  <a href="/#contato">
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-primary text-primary hover:bg-primary/10"
                    >
                      Entre em contato
                    </Button>
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/entrar">
                    <Button className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary-hover">
                      Entrar
                    </Button>
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
};

export default PublicNavbar;
