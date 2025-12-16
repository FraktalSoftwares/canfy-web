import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
        
        <Card className="rounded-[10px] bg-secondary border-none">
          <CardContent className="pt-6 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
              <p className="text-muted-foreground">
                A Canfy está comprometida em proteger sua privacidade e seus dados pessoais.
                Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos
                suas informações de acordo com a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Dados Coletados</h2>
              <p className="text-muted-foreground mb-2">Coletamos os seguintes tipos de informações:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Dados cadastrais: nome, e-mail, telefone, CPF</li>
                <li>Dados médicos: prescrições, histórico de tratamentos, documentos médicos</li>
                <li>Dados de uso: logs de acesso, interações com a plataforma</li>
                <li>Dados de localização: endereço para entrega de medicamentos</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Finalidade do Tratamento</h2>
              <p className="text-muted-foreground mb-2">Utilizamos seus dados para:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Gerenciar prescrições e pedidos de cannabis medicinal</li>
                <li>Facilitar a comunicação entre pacientes, médicos e associações</li>
                <li>Garantir a segurança e integridade da plataforma</li>
                <li>Cumprir obrigações legais e regulatórias</li>
                <li>Melhorar nossos serviços através de análises agregadas</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Dados</h2>
              <p className="text-muted-foreground">
                Seus dados pessoais e médicos são compartilhados apenas com médicos autorizados,
                associações parceiras e autoridades competentes quando exigido por lei.
                Nunca vendemos seus dados para terceiros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Segurança dos Dados</h2>
              <p className="text-muted-foreground">
                Implementamos medidas técnicas e organizacionais para proteger seus dados contra
                acesso não autorizado, perda, destruição ou alteração. Utilizamos criptografia,
                controle de acesso e monitoramento contínuo de segurança.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Seus Direitos</h2>
              <p className="text-muted-foreground mb-2">De acordo com a LGPD, você tem direito a:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Confirmar a existência de tratamento de dados</li>
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar a anonimização, bloqueio ou eliminação de dados</li>
                <li>Revogar o consentimento</li>
                <li>Solicitar a portabilidade dos dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Retenção de Dados</h2>
              <p className="text-muted-foreground">
                Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas
                nesta política ou conforme exigido por lei. Dados médicos são mantidos por
                período mínimo de 20 anos conforme legislação aplicável.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Cookies e Tecnologias Similares</h2>
              <p className="text-muted-foreground">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência,
                manter sua sessão ativa e analisar o uso da plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Alterações na Política</h2>
              <p className="text-muted-foreground">
                Podemos atualizar esta Política de Privacidade periodicamente.
                Notificaremos você sobre alterações significativas através da plataforma ou por e-mail.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contato do Encarregado de Dados</h2>
              <p className="text-muted-foreground">
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato
                com nosso Encarregado de Proteção de Dados (DPO):
              </p>
              <p className="text-muted-foreground mt-2">
                E-mail: dpo@canfy.com.br<br />
                Telefone: (11) 0000-0000
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

export default PoliticaPrivacidade;
