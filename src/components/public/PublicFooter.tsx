import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";

const PublicFooter = () => {
  return (
    <footer id="contato" className="border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-14 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <img src={logo} alt="Canfy" className="h-8 w-auto" />
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-foreground">Institucional</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-primary">Sobre</Link></li>
            <li><Link to="/termos-de-uso" className="hover:text-primary">Termos de Uso</Link></li>
            <li><Link to="/politica-privacidade" className="hover:text-primary">Política de Privacidade</Link></li>
            <li><a href="mailto:contato@canfy.com.br" className="hover:text-primary">Suporte</a></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-foreground">Plataforma</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/entrar" className="hover:text-primary">Para pacientes</Link></li>
            <li><Link to="/entrar" className="hover:text-primary">Para médicos</Link></li>
            <li><Link to="/blog" className="hover:text-primary">Blog Canfy</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold text-foreground">Contatos</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="mailto:contato@canfy.com.br" className="text-primary underline hover:text-primary-dark">
                contato@canfy.com.br
              </a>
            </li>
            <li>+55 (11) 94312-3155</li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
