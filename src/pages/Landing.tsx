import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FileEdit,
  Package,
  Handshake,
  UserRound,
} from "lucide-react";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import heroPhones from "@/assets/landing/hero-phones.png";
import stepConsulta from "@/assets/landing/step-consulta.png";
import stepCatalogo from "@/assets/landing/step-catalogo.png";
import stepAdmin from "@/assets/landing/step-admin.png";
import stepEcossistema from "@/assets/landing/step-ecossistema.png";

const features = [
  {
    icon: FileEdit,
    title: "Prescrição digital",
    description: "Médicos podem prescrever produtos com poucos cliques.",
  },
  {
    icon: Package,
    title: "Catálogo de produtos",
    description: "Acesso a óleos, cápsulas e outros formatos regulamentados.",
  },
  {
    icon: Handshake,
    title: "Associações e marcas",
    description: "Integração direta com fornecedores autorizados.",
  },
  {
    icon: UserRound,
    title: "Área do paciente",
    description: "Pacientes recebem e acompanham suas prescrições de forma simples.",
  },
];

const steps = [
  {
    title: "Consulta e prescrição",
    description:
      "Interface intuitiva para médicos realizarem prescrições digitais de forma rápida e segura.",
    image: stepConsulta,
    alt: "Tela de consulta e chat entre médico e paciente no app Canfy",
  },
  {
    title: "Catálogo de produtos",
    description:
      "Amplo catálogo com produtos regulamentados e informações detalhadas para prescrição.",
    image: stepCatalogo,
    alt: "Tela de catálogo de produtos de cannabis medicinal no app Canfy",
  },
  {
    title: "Área de administração",
    description:
      "Gerencie pedidos, pagamentos e histórico de pacientes e fornecedores em um só painel.",
    image: stepAdmin,
    alt: "Painel de administração da plataforma Canfy em um notebook",
  },
  {
    title: "Ecossistema acolhedor",
    description: "Um espaço que conecta todos os envolvidos, com praticidade e cuidado.",
    image: stepEcossistema,
    alt: "Aplicativo Canfy conectando pessoas com cuidado e acolhimento",
  },
];

const Landing = () => {
  useEffect(() => {
    document.title = "Canfy — Plataforma de prescrição de cannabis medicinal";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 40%, hsl(var(--card-green)) 0%, transparent 60%), radial-gradient(50% 40% at 20% 70%, hsl(var(--card-pink)) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-10 text-center">
          <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-5xl">
            Plataforma completa para prescrição e acesso a{" "}
            <span className="text-primary">produtos de cannabis medicinal</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
            Conectamos médicos, pacientes, associações e produtos em um só lugar, com segurança e
            praticidade.
          </p>
          <div className="mt-10">
            <Link to="/entrar">
              <Button
                size="lg"
                className="rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary-hover"
              >
                Começar agora
              </Button>
            </Link>
          </div>
        </div>

        {/* Mockups do app */}
        <div className="mx-auto max-w-5xl px-6 pb-16">
          <img
            src={heroPhones}
            alt="Aplicativo Canfy exibindo a tela inicial e a prescrição de produtos"
            className="mx-auto w-full max-w-4xl"
            loading="eager"
          />
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Tudo que você precisa em uma plataforma
          </h2>
          <p className="mt-4 text-muted-foreground">
            Soluções integradas para médicos, pacientes e fornecedores de cannabis medicinal.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-[10px] border border-border/60 bg-card p-6 text-center transition-shadow hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-card-green">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Veja a plataforma em ação */}
      <section id="plataforma" className="relative overflow-hidden py-20">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(50% 40% at 30% 20%, hsl(var(--card-green)) 0%, transparent 60%), radial-gradient(50% 40% at 70% 80%, hsl(var(--card-purple)) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Veja a plataforma em ação
          </h2>
          <p className="mt-4 text-muted-foreground">
            Interfaces pensadas para facilitar cada etapa do processo de prescrição e acesso à
            cannabis medicinal.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl px-6">
          <ol className="relative space-y-16 lg:space-y-24 before:absolute before:left-6 before:top-6 before:hidden before:h-[calc(100%-3rem)] before:w-px before:bg-primary/20 lg:before:block">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16"
              >
                {/* Texto + número */}
                <div className="flex gap-5 lg:gap-6">
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <div className="pt-1">
                    <h3 className="font-display text-xl font-semibold text-foreground md:text-2xl">
                      {s.title}
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground md:text-base">
                      {s.description}
                    </p>
                  </div>
                </div>

                {/* Mockup */}
                <div className="flex justify-center lg:justify-end">
                  <img
                    src={s.image}
                    alt={s.alt}
                    className="w-full max-w-md"
                    loading="lazy"
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Landing;
