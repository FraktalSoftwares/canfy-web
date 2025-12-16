import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";

const TermosDeUso = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Termos de Uso</h1>
        
        <Card className="rounded-[10px] bg-secondary border-none">
          <CardContent className="pt-6 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
              <p className="text-muted-foreground">
                Ao acessar e usar a plataforma Canfy, você aceita e concorda em cumprir estes Termos de Uso.
                Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Uso da Plataforma</h2>
              <p className="text-muted-foreground mb-2">
                A plataforma Canfy é destinada ao gerenciamento de prescrições e pedidos de cannabis medicinal.
                Ao utilizar nossos serviços, você concorda em:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Manter a confidencialidade de suas credenciais de acesso</li>
                <li>Usar a plataforma apenas para fins legítimos e autorizados</li>
                <li>Respeitar as leis aplicáveis sobre cannabis medicinal</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Responsabilidades do Usuário</h2>
              <p className="text-muted-foreground">
                Você é responsável por todas as atividades realizadas em sua conta e deve notificar
                imediatamente a Canfy sobre qualquer uso não autorizado.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Privacidade e Proteção de Dados</h2>
              <p className="text-muted-foreground">
                Seus dados pessoais e de saúde são tratados de acordo com nossa Política de Privacidade
                e a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Limitação de Responsabilidade</h2>
              <p className="text-muted-foreground">
                A Canfy não se responsabiliza por decisões médicas tomadas com base nas informações
                disponibilizadas na plataforma. Consulte sempre um profissional de saúde qualificado.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Modificações dos Termos</h2>
              <p className="text-muted-foreground">
                Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações
                entrarão em vigor imediatamente após sua publicação na plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Contato</h2>
              <p className="text-muted-foreground">
                Para questões sobre estes Termos de Uso, entre em contato conosco através do e-mail:
                contato@canfy.com.br
              </p>
            </section>

            <p className="text-sm text-muted-foreground pt-4 border-t border-border">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermosDeUso;
