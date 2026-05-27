import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, LogOut, ArrowLeft, Check, User, Mail, Phone, Lock, Eye, EyeOff, Plus, RotateCw, ChevronRight, Trash2, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Usuario {
  id: string;
  nome_completo: string;
  email: string;
  foto_perfil_url: string | null;
}

const MinhaConta = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dados-basicos");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserData, setSelectedUserData] = useState<Usuario | null>(null);
  const [adicionarUsuarioOpen, setAdicionarUsuarioOpen] = useState(false);
  const [novoUsuarioNome, setNovoUsuarioNome] = useState("");
  const [novoUsuarioEmail, setNovoUsuarioEmail] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(false);
  const { toast } = useToast();
  
  // Permissões do usuário
  const [permissoes, setPermissoes] = useState({
    acessos: { acessar: false, editar: false },
    usuarios: { acessar: false, editar: false },
    receitas: { acessar: false, editar: false },
    produtos: { acessar: false, editar: false },
    associacoes: { acessar: false, editar: false },
  });

  // Permissões para novo usuário
  const [novoUsuarioPermissoes, setNovoUsuarioPermissoes] = useState({
    acessos: { acessar: false, editar: false },
    usuarios: { acessar: false, editar: false },
    receitas: { acessar: false, editar: false },
    produtos: { acessar: false, editar: false },
    associacoes: { acessar: false, editar: false },
  });
  
  // Configurações de notificação
  const [notifPrefs, setNotifPrefs] = useState({
    alertasEmail: true,
    alertasSMS: false,
    alertasPush: true,
    alertasConsultas: true,
    alertasEntregas: true,
    alertasAnvisa: true,
    alertasNovasReceitas: true,
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Buscar usuários do sistema
  const fetchUsuarios = async () => {
    setIsLoadingUsuarios(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      
      // Buscar todos os profiles exceto o usuário logado
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome_completo, foto_perfil_url')
        .eq('ativo', true)
        .neq('id', authData.user?.id || '');

      if (error) throw error;

      // Como não temos acesso aos emails via auth.users no client,
      // vamos precisar criar uma edge function ou adicionar email ao profile
      // Por enquanto, vamos usar um placeholder
      const usuariosComEmail: Usuario[] = (data || []).map(profile => ({
        id: profile.id,
        nome_completo: profile.nome_completo,
        email: 'Email não disponível', // Temporário - será resolvido com edge function
        foto_perfil_url: profile.foto_perfil_url,
      }));

      setUsuarios(usuariosComEmail);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsuarios(false);
    }
  };

  // Buscar dados do usuário logado
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          setEmail(user.email || "");

          // Buscar dados do profile
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Erro ao buscar perfil:', error);
            toast({
              title: "Erro ao carregar dados",
              description: "Não foi possível carregar suas informações.",
              variant: "destructive",
            });
          } else if (profile) {
            setNomeCompleto(profile.nome_completo || "");
            setTelefone(profile.telefone || "");
            setFotoPerfilUrl(profile.foto_perfil_url || "");
          }

          // Buscar permissões do usuário
          const { data: permissoesData } = await supabase
            .from('user_permissions')
            .select('*')
            .eq('user_id', user.id);

          if (permissoesData) {
            const novasPermissoes = {
              acessos: { acessar: false, editar: false },
              usuarios: { acessar: false, editar: false },
              receitas: { acessar: false, editar: false },
              produtos: { acessar: false, editar: false },
              associacoes: { acessar: false, editar: false },
            };

            permissoesData.forEach((perm) => {
              if (perm.modulo === 'acessos') {
                novasPermissoes.acessos = { acessar: perm.pode_acessar, editar: perm.pode_editar };
              } else if (perm.modulo === 'usuarios') {
                novasPermissoes.usuarios = { acessar: perm.pode_acessar, editar: perm.pode_editar };
              } else if (perm.modulo === 'receitas') {
                novasPermissoes.receitas = { acessar: perm.pode_acessar, editar: perm.pode_editar };
              } else if (perm.modulo === 'produtos') {
                novasPermissoes.produtos = { acessar: perm.pode_acessar, editar: perm.pode_editar };
              } else if (perm.modulo === 'associacoes') {
                novasPermissoes.associacoes = { acessar: perm.pode_acessar, editar: perm.pode_editar };
              }
            });

            setPermissoes(novasPermissoes);
          }

          // Buscar preferências de notificação
          const { data: prefsData } = await supabase
            .from('preferencias_notificacoes')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (prefsData) {
            setNotifPrefs({
              alertasEmail: prefsData.notif_email,
              alertasSMS: prefsData.notif_sms,
              alertasPush: prefsData.notif_push,
              alertasConsultas: prefsData.tipos_consultas,
              alertasEntregas: prefsData.tipos_entregas,
              alertasAnvisa: prefsData.tipos_anvisa,
              alertasNovasReceitas: prefsData.tipos_novas_receitas,
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [toast]);

  // Carregar usuários quando a aba de acessos for aberta
  useEffect(() => {
    if (activeTab === 'acessos') {
      fetchUsuarios();
    }
  }, [activeTab]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleSavePermissions = async () => {
    if (!userId) return;

    try {
      // Deletar permissões antigas
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Inserir novas permissões
      const permissoesArray = [];
      
      Object.entries(permissoes).forEach(([modulo, perms]) => {
        permissoesArray.push({
          user_id: userId,
          modulo,
          pode_acessar: perms.acessar,
          pode_editar: perms.editar,
        });
      });

      const { error } = await supabase
        .from('user_permissions')
        .insert(permissoesArray);

      if (error) {
        toast({
          title: "Erro ao salvar permissões",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Permissões atualizadas!",
          description: "As permissões foram salvas com sucesso.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar permissões",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome_completo: nomeCompleto,
          telefone: telefone,
          foto_perfil_url: fotoPerfilUrl,
        })
        .eq('id', userId);

      if (error) {
        toast({
          title: "Erro ao salvar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Dados atualizados!",
          description: "Suas informações foram salvas com sucesso.",
        });
        setIsEditing(false);
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/entrar";
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validar tipo e tamanho do arquivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, envie uma imagem JPG, PNG, WEBP ou GIF.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // Deletar foto antiga se existir
      if (fotoPerfilUrl) {
        const oldPath = fotoPerfilUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload da nova foto
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ foto_perfil_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      setFotoPerfilUrl(publicUrl);
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi alterada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message || "Não foi possível atualizar a foto.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUpdatePassword = async () => {
    // Validações
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos de senha.",
        variant: "destructive",
      });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (novaSenha.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // Primeiro, tentar fazer login com a senha atual para validar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: senhaAtual,
      });

      if (signInError) {
        toast({
          title: "Senha atual incorreta",
          description: "A senha atual que você digitou está incorreta.",
          variant: "destructive",
        });
        return;
      }

      // Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso.",
      });

      // Limpar campos
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message || "Não foi possível atualizar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCadastrarNovoUsuario = async () => {
    // Validações
    if (!novoUsuarioNome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira o nome completo do usuário.",
        variant: "destructive",
      });
      return;
    }

    if (!novoUsuarioEmail.trim()) {
      toast({
        title: "E-mail obrigatório",
        description: "Por favor, insira o e-mail do usuário.",
        variant: "destructive",
      });
      return;
    }

    // Validar formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(novoUsuarioEmail)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um endereço de e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Criar novo usuário no Supabase Auth
      const senhaTemporaria = Math.random().toString(36).slice(-12) + "A1!"; // Senha temporária forte
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: novoUsuarioEmail,
        password: senhaTemporaria,
        options: {
          data: {
            nome_completo: novoUsuarioNome,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast({
            title: "E-mail já cadastrado",
            description: "Este e-mail já está registrado no sistema.",
            variant: "destructive",
          });
        } else {
          throw authError;
        }
        return;
      }

      if (!authData.user) {
        throw new Error("Erro ao criar usuário");
      }

      // Criar permissões para o novo usuário
      const permissoesArray = [];
      Object.entries(novoUsuarioPermissoes).forEach(([modulo, perms]) => {
        if (perms.acessar || perms.editar) {
          permissoesArray.push({
            user_id: authData.user.id,
            modulo,
            pode_acessar: perms.acessar,
            pode_editar: perms.editar,
          });
        }
      });

      if (permissoesArray.length > 0) {
        const { error: permError } = await supabase
          .from('user_permissions')
          .insert(permissoesArray);

        if (permError) {
          console.error("Erro ao criar permissões:", permError);
        }
      }

      toast({
        title: "Usuário cadastrado!",
        description: `${novoUsuarioNome} foi adicionado com sucesso. Um e-mail foi enviado para ${novoUsuarioEmail} com instruções de login.`,
      });

      // Limpar formulário e fechar modal
      setAdicionarUsuarioOpen(false);
      setNovoUsuarioNome("");
      setNovoUsuarioEmail("");
      setNovoUsuarioPermissoes({
        acessos: { acessar: false, editar: false },
        usuarios: { acessar: false, editar: false },
        receitas: { acessar: false, editar: false },
        produtos: { acessar: false, editar: false },
        associacoes: { acessar: false, editar: false },
      });
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar usuário",
        description: error.message || "Não foi possível criar o usuário.",
        variant: "destructive",
      });
    }
  };

  const handleSaveNotificationPreferences = async () => {
    if (!userId) return;

    setIsSavingPrefs(true);

    try {
      // Verificar se já existe uma preferência
      const { data: existingPref } = await supabase
        .from('preferencias_notificacoes')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const prefsData = {
        user_id: userId,
        notif_email: notifPrefs.alertasEmail,
        notif_sms: notifPrefs.alertasSMS,
        notif_push: notifPrefs.alertasPush,
        tipos_consultas: notifPrefs.alertasConsultas,
        tipos_entregas: notifPrefs.alertasEntregas,
        tipos_anvisa: notifPrefs.alertasAnvisa,
        tipos_novas_receitas: notifPrefs.alertasNovasReceitas,
      };

      let error;

      if (existingPref) {
        // Atualizar preferências existentes
        const result = await supabase
          .from('preferencias_notificacoes')
          .update(prefsData)
          .eq('user_id', userId);
        error = result.error;
      } else {
        // Inserir novas preferências
        const result = await supabase
          .from('preferencias_notificacoes')
          .insert(prefsData);
        error = result.error;
      }

      if (error) {
        throw error;
      }

      toast({
        title: "Preferências salvas!",
        description: "Suas configurações de notificação foram atualizadas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar preferências",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">

        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      
      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {isEditing && (
            <Button
              variant="ghost"
              onClick={() => setIsEditing(false)}
              className="gap-2 text-foreground hover:bg-transparent p-0"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar
            </Button>
          )}
          {!isEditing && <div />}
          
          {activeTab === "dados-basicos" && (
            <Button
              variant="outline"
              onClick={() => {
                if (isEditing) {
                  handleSaveProfile();
                } else {
                  setIsEditing(true);
                }
              }}
              className={`gap-2 rounded-full ${
                isEditing 
                  ? 'bg-green-600 text-white hover:bg-green-700 border-green-600' 
                  : 'border-green-600 text-green-600 hover:bg-green-50'
              }`}
            >
              {isEditing ? (
                <>
                  <Check className="h-4 w-4" />
                  Salvar dados
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  Editar conta
                </>
              )}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8 bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0">
            <TabsTrigger 
              value="dados-basicos" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground px-6 pb-3 font-semibold text-base"
            >
              Dados básicos
            </TabsTrigger>
            <TabsTrigger 
              value="acessos" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground px-6 pb-3 font-normal text-base text-muted-foreground"
            >
              Acessos
            </TabsTrigger>
            <TabsTrigger 
              value="configuracoes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground px-6 pb-3 font-normal text-base text-muted-foreground"
            >
              Configurações
            </TabsTrigger>
            <TabsTrigger 
              value="sobre" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground px-6 pb-3 font-normal text-base text-muted-foreground"
            >
              Sobre
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados-basicos" className="mt-0">
            {/* Dados pessoais */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Dados pessoais</h2>
              
              <Card className="rounded-[10px] bg-secondary border-none mb-8">
                <CardContent className="pt-6">
                  {/* Avatar e nome */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={fotoPerfilUrl} />
                        <AvatarFallback className="bg-primary text-white font-medium text-2xl">
                          {nomeCompleto.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {isEditing && (
                        <>
                          <input
                            type="file"
                            id="photo-upload"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            disabled={isUploadingPhoto}
                          />
                          <label
                            htmlFor="photo-upload"
                            className="absolute bottom-0 right-0 h-8 w-8 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 cursor-pointer"
                          >
                            {isUploadingPhoto ? (
                              <RotateCw className="h-4 w-4 text-white animate-spin" />
                            ) : (
                              <Pencil className="h-4 w-4 text-white" />
                            )}
                          </label>
                        </>
                      )}
                    </div>
                    {!isEditing && (
                      <div>
                        <h3 className="text-xl font-bold">{nomeCompleto || "Usuário"}</h3>
                        <p className="text-sm text-muted-foreground">{email}</p>
                      </div>
                    )}
                  </div>

                  {/* Campos de informação */}
                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome Completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="nome"
                            value={nomeCompleto}
                            onChange={(e) => setNomeCompleto(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email-edit">E-mail</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                              id="email-edit"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="telefone">Telefone</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                              id="telefone"
                              value={telefone}
                              onChange={(e) => setTelefone(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center py-3 border-b border-border">
                        <span className="text-sm text-muted-foreground w-32">E-mail</span>
                        <span className="text-sm font-medium">{email}</span>
                      </div>
                      
                      <div className="flex items-center py-3 border-b border-border">
                        <span className="text-sm text-muted-foreground w-32">Telefone</span>
                        <span className="text-sm font-medium">{telefone || "Não informado"}</span>
                      </div>
                      
                      <div className="flex items-center py-3">
                        <span className="text-sm text-muted-foreground w-32">Senha</span>
                        <span className="text-sm font-medium">••••••••</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Segurança da conta - apenas em modo edição */}
              {isEditing && (
                <Card className="rounded-[10px] bg-secondary border-none mb-8">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-bold mb-2">Segurança da conta</h3>
                    <p className="text-sm text-muted-foreground mb-6">Altere sua senha atual, se desejar.</p>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="senha-atual">Senha atual</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="senha-atual"
                            type={showSenhaAtual ? "text" : "password"}
                            placeholder="Insira sua senha atual"
                            value={senhaAtual}
                            onChange={(e) => setSenhaAtual(e.target.value)}
                            className="pl-10 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                          >
                            {showSenhaAtual ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nova-senha">Nova senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="nova-senha"
                            type={showNovaSenha ? "text" : "password"}
                            placeholder="Insira sua nova senha"
                            value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                            className="pl-10 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNovaSenha(!showNovaSenha)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                          >
                            {showNovaSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="confirmar-senha"
                            type={showConfirmarSenha ? "text" : "password"}
                            placeholder="Confirme sua nova senha"
                            value={confirmarSenha}
                            onChange={(e) => setConfirmarSenha(e.target.value)}
                            className="pl-10 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          variant="outline"
                          onClick={handleUpdatePassword}
                          disabled={isUpdatingPassword}
                          className="rounded-full border-green-600 text-green-600 hover:bg-green-50"
                        >
                          {isUpdatingPassword ? "Atualizando..." : "Atualizar senha"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sobre - apenas em modo edição */}
              {isEditing && (
                <Card className="rounded-[10px] bg-secondary border-none mb-8">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-bold mb-2">Sobre</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Consulte os documentos para saber mais sobre como usamos suas informações.
                    </p>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => navigate("/termos-de-uso")}
                        className="rounded-full border-green-600 text-green-600 hover:bg-green-50"
                      >
                        Ver termos de uso
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/politica-privacidade")}
                        className="rounded-full border-green-600 text-green-600 hover:bg-green-50"
                      >
                        Ver Política de Privacidade
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sair da conta - apenas quando não está editando */}
            {!isEditing && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da conta
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="acessos">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Acessos</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <RotateCw className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  onClick={() => setAdicionarUsuarioOpen(true)}
                  className="gap-2 border-green-600 text-green-600 hover:bg-green-50 rounded-full"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar usuário
                </Button>
              )}
            </div>

            {/* Modal Adicionar Usuário */}
            <Dialog open={adicionarUsuarioOpen} onOpenChange={setAdicionarUsuarioOpen}>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
                <DialogHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <DialogTitle className="text-lg font-bold mb-1">Cadastrar novo usuário</DialogTitle>
                      <p className="text-sm text-muted-foreground font-normal">
                        Preencha as informações abaixo para cadastrar um novo usuário.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAdicionarUsuarioOpen(false)}
                      className="h-6 w-6 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="novo-nome">Nome Completo</Label>
                    <Input
                      id="novo-nome"
                      placeholder="Digite seu nome e sobrenome"
                      value={novoUsuarioNome}
                      onChange={(e) => setNovoUsuarioNome(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="novo-email">E-mail</Label>
                    <Input
                      id="novo-email"
                      type="email"
                      placeholder="Insira e-mail do usuário"
                      value={novoUsuarioEmail}
                      onChange={(e) => setNovoUsuarioEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Permissões</Label>
                    
                    <Accordion type="single" collapsible className="space-y-2">
                      <AccordionItem value="acessos" className="border-none">
                        <AccordionTrigger className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-3 rounded-lg hover:no-underline">
                          Acessos
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-4">
                          <p className="text-sm text-muted-foreground">Configurações de acessos...</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="usuarios" className="border-none">
                        <AccordionTrigger className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-3 rounded-lg hover:no-underline">
                          Usuários
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-4 space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="novo-selecionar-tudo"
                              onCheckedChange={(checked) => {
                                setNovoUsuarioPermissoes({
                                  acessos: { acessar: checked as boolean, editar: checked as boolean },
                                  usuarios: { acessar: checked as boolean, editar: checked as boolean },
                                  receitas: { acessar: checked as boolean, editar: checked as boolean },
                                  produtos: { acessar: checked as boolean, editar: checked as boolean },
                                  associacoes: { acessar: checked as boolean, editar: checked as boolean },
                                });
                              }}
                            />
                            <label
                              htmlFor="novo-selecionar-tudo"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Selecionar tudo
                            </label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="novo-acessar-modulo"
                              checked={novoUsuarioPermissoes.usuarios.acessar}
                              onCheckedChange={(checked) => 
                                setNovoUsuarioPermissoes({...novoUsuarioPermissoes, usuarios: {...novoUsuarioPermissoes.usuarios, acessar: checked as boolean}})
                              }
                            />
                            <label
                              htmlFor="novo-acessar-modulo"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Acessar módulo de usuários
                            </label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="novo-editar-dados"
                              checked={novoUsuarioPermissoes.usuarios.editar}
                              onCheckedChange={(checked) => 
                                setNovoUsuarioPermissoes({...novoUsuarioPermissoes, usuarios: {...novoUsuarioPermissoes.usuarios, editar: checked as boolean}})
                              }
                            />
                            <label
                              htmlFor="novo-editar-dados"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Editar dados dos usuários
                            </label>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="receitas" className="border-none">
                        <AccordionTrigger className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-3 rounded-lg hover:no-underline">
                          Receitas e pedidos
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-4">
                          <p className="text-sm text-muted-foreground">Configurações de receitas...</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="catalogo" className="border-none">
                        <AccordionTrigger className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-3 rounded-lg hover:no-underline">
                          Catálogo de produtos
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-4">
                          <p className="text-sm text-muted-foreground">Configurações de catálogo...</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="associacoes" className="border-none">
                        <AccordionTrigger className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-3 rounded-lg hover:no-underline">
                          Associações/marcas
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-4">
                          <p className="text-sm text-muted-foreground">Configurações de associações...</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={() => {
                        setAdicionarUsuarioOpen(false);
                        setNovoUsuarioNome("");
                        setNovoUsuarioEmail("");
                        setNovoUsuarioPermissoes({
                          acessos: { acessar: false, editar: false },
                          usuarios: { acessar: false, editar: false },
                          receitas: { acessar: false, editar: false },
                          produtos: { acessar: false, editar: false },
                          associacoes: { acessar: false, editar: false },
                        });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 rounded-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleCadastrarNovoUsuario}
                    >
                      Concluir cadastro
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="grid grid-cols-12 gap-6">
              {/* Lista de usuários */}
              <div className={selectedUser ? "col-span-4" : "col-span-12"}>
                {isLoadingUsuarios ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando usuários...
                  </div>
                ) : usuarios.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                ) : (
                  <div className="space-y-3">
                    {usuarios.map((usuario) => (
                      <Card 
                        key={usuario.id} 
                        className={`rounded-[10px] border-none hover:bg-secondary/80 transition-colors cursor-pointer ${
                          selectedUser === usuario.id ? 'bg-secondary' : 'bg-secondary/50'
                        }`}
                      >
                        <CardContent className="p-4">
                          <button 
                            className="w-full flex items-center justify-between"
                            onClick={() => {
                              setSelectedUser(usuario.id);
                              setSelectedUserData(usuario);
                            }}
                          >
                            <span className="text-sm font-medium">{usuario.nome_completo}</span>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Detalhes e permissões do usuário */}
              {selectedUser && selectedUserData && (
                <div className="col-span-8">
                  <Card className="rounded-[10px] bg-secondary border-none">
                    <CardContent className="pt-6">
                      {/* Info do usuário */}
                      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={selectedUserData.foto_perfil_url || ""} />
                          <AvatarFallback className="bg-primary text-white font-medium text-lg">
                            {selectedUserData.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-bold">{selectedUserData.nome_completo}</h3>
                          <p className="text-sm text-green-600">
                            {selectedUserData.email}
                          </p>
                        </div>
                      </div>

                      {/* Permissões */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold mb-4">Permissões</h4>
                        
                        <Accordion type="multiple" className="space-y-2">
                          {/* Acessos */}
                          <AccordionItem value="acessos" className="border-none">
                            <AccordionTrigger className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-3 rounded-lg hover:no-underline">
                              Acessos
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-4 space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="acessos-selecionar-tudo"
                                  checked={permissoes.acessos.acessar && permissoes.acessos.editar}
                                  onCheckedChange={(checked) => {
                                    setPermissoes({...permissoes, acessos: { acessar: checked as boolean, editar: checked as boolean }});
                                  }}
                                />
                                <label
                                  htmlFor="acessos-selecionar-tudo"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Selecionar tudo
                                </label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="acessos-acessar-modulo"
                                  checked={permissoes.acessos.acessar}
                                  onCheckedChange={(checked) => 
                                    setPermissoes({...permissoes, acessos: {...permissoes.acessos, acessar: checked as boolean}})
                                  }
                                />
                                <label
                                  htmlFor="acessos-acessar-modulo"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Acessar módulo de usuários
                                </label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="acessos-editar-dados"
                                  checked={permissoes.acessos.editar}
                                  onCheckedChange={(checked) => 
                                    setPermissoes({...permissoes, acessos: {...permissoes.acessos, editar: checked as boolean}})
                                  }
                                />
                                <label
                                  htmlFor="acessos-editar-dados"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Editar dados dos usuários
                                </label>
                              </div>
                            </AccordionContent>
                          </AccordionItem>

                          {/* Usuários */}
                          <AccordionItem value="usuarios" className="border-none">
                            <AccordionTrigger className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-3 rounded-lg hover:no-underline">
                              Usuários
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-4 space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="usuarios-selecionar-tudo"
                                  checked={permissoes.usuarios.acessar && permissoes.usuarios.editar}
                                  onCheckedChange={(checked) => {
                                    setPermissoes({...permissoes, usuarios: { acessar: checked as boolean, editar: checked as boolean }});
                                  }}
                                />
                                <label
                                  htmlFor="usuarios-selecionar-tudo"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Selecionar tudo
                                </label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="usuarios-acessar-modulo"
                                  checked={permissoes.usuarios.acessar}
                                  onCheckedChange={(checked) => 
                                    setPermissoes({...permissoes, usuarios: {...permissoes.usuarios, acessar: checked as boolean}})
                                  }
                                />
                                <label
                                  htmlFor="usuarios-acessar-modulo"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Acessar módulo de usuários
                                </label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="usuarios-editar-dados"
                                  checked={permissoes.usuarios.editar}
                                  onCheckedChange={(checked) => 
                                    setPermissoes({...permissoes, usuarios: {...permissoes.usuarios, editar: checked as boolean}})
                                  }
                                />
                                <label
                                  htmlFor="usuarios-editar-dados"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Editar dados dos usuários
                                </label>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-full"
                          onClick={() => setSelectedUser(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          className="flex-1 rounded-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={handleSavePermissions}
                        >
                          Salvar alterações
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="configuracoes">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Preferências de notificação</h2>
              
              <Card className="rounded-[10px] bg-secondary border-none mb-6">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">Alertas por e-mail</span>
                    <Switch 
                      checked={notifPrefs.alertasEmail}
                      onCheckedChange={(checked) => setNotifPrefs({...notifPrefs, alertasEmail: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">Alertas por SMS</span>
                    <Switch 
                      checked={notifPrefs.alertasSMS}
                      onCheckedChange={(checked) => setNotifPrefs({...notifPrefs, alertasSMS: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">Alertas por push</span>
                    <Switch 
                      checked={notifPrefs.alertasPush}
                      onCheckedChange={(checked) => setNotifPrefs({...notifPrefs, alertasPush: checked})}
                    />
                  </div>
                </CardContent>
              </Card>

              <h2 className="text-2xl font-bold mb-6">Tipos de notificações</h2>
              
              <Card className="rounded-[10px] bg-secondary border-none mb-6">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">Alertas sobre consultas</span>
                    <Switch 
                      checked={notifPrefs.alertasConsultas}
                      onCheckedChange={(checked) => setNotifPrefs({...notifPrefs, alertasConsultas: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">Alertas sobre entregas</span>
                    <Switch 
                      checked={notifPrefs.alertasEntregas}
                      onCheckedChange={(checked) => setNotifPrefs({...notifPrefs, alertasEntregas: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">Alertas sobre a Anvisa</span>
                    <Switch 
                      checked={notifPrefs.alertasAnvisa}
                      onCheckedChange={(checked) => setNotifPrefs({...notifPrefs, alertasAnvisa: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">Alertas sobre novas receitas</span>
                    <Switch 
                      checked={notifPrefs.alertasNovasReceitas}
                      onCheckedChange={(checked) => setNotifPrefs({...notifPrefs, alertasNovasReceitas: checked})}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  className="gap-2 bg-white text-green-600 border border-green-600 hover:bg-green-50 rounded-full"
                  onClick={handleSaveNotificationPreferences}
                  disabled={isSavingPrefs}
                >
                  <Check className="h-4 w-4" />
                  {isSavingPrefs ? "Salvando..." : "Salvar preferências"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sobre">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-8">Política de Privacidade</h2>
              
              <div className="space-y-8">
                {/* Seção 1 */}
                <div>
                  <h3 className="text-lg font-bold text-green-600 mb-4">1. Introdução</h3>
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque nec lacus nec nisi vestibulum fermentum. Sed gravida orci vel nisi convallis, nec tincidunt mauris euismod. Ut euismod libero sit amet quam scelerisque, eget scelerisque elit tristique. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Morbi non ex ac velit tincidunt dapibus.
                    </p>
                    <p>
                      Curabitur vel mi sed tortor rhoncus condimentum. Nulla facilisi. Integer id lectus ut risus fermentum viverra in et metus. Cras malesuada ligula non metus volutpat, nec hendrerit ligula luctus. Fusce eget justo at libero malesuada elementum. Mauris vel eros sed orci eleifend vehicula. Sed fringilla magna ac odio fringilla, in laoreet felis ultricies.
                    </p>
                  </div>
                </div>

                {/* Seção 2 */}
                <div>
                  <h3 className="text-lg font-bold text-green-600 mb-4">2. Informações gerais</h3>
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque nec lacus nec nisi vestibulum fermentum. Sed gravida orci vel nisi convallis, nec tincidunt mauris euismod. Ut euismod libero sit amet quam scelerisque, eget scelerisque elit tristique. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Morbi non ex ac velit tincidunt dapibus.
                    </p>
                    <p>
                      Curabitur vel mi sed tortor rhoncus condimentum. Nulla facilisi. Integer id lectus ut risus fermentum viverra in et metus. Cras malesuada ligula non metus volutpat, nec hendrerit ligula luctus. Fusce eget justo at libero malesuada elementum. Mauris vel eros sed orci eleifend vehicula. Sed fringilla magna ac odio fringilla, in laoreet felis ultricies.
                    </p>
                  </div>
                </div>

                {/* Seção 3 */}
                <div>
                  <h3 className="text-lg font-bold text-green-600 mb-4">3. Sobre a aplicação Canfy</h3>
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      O Canfy é uma plataforma de gestão médica para prescrição e acompanhamento de produtos à base de cannabis medicinal, composta por uma aplicação para smartphones e tablets e de uma webpage administrativa, que contém as mesmas funcionalidades da aplicação, acrescida de gráficos e índices calculados a partir dos dados inseridos pelo USUÁRIO.
                    </p>
                    <p>
                      O USUÁRIO garante que os dados fornecidos ao Canfy sejam verdadeiros, precisos, completos e atualizados. Para esses fins, o USUÁRIO responde à veracidade dos dados que ele comunicar às ora referidas aplicações convenientemente, para que ele responda à sua situação atual.
                    </p>
                    <p>
                      O USUÁRIO será responsável pelas informações falsas, excessivas ou imprecisas que ele fornecer por meio das aplicações do Canfy e pelos danos, diretos ou indiretos, que isso cause ao Canfy ou a terceiros.
                    </p>
                    <p>
                      O Canfy não será responsável pelos dados fornecidos por menores de idade que não tenham a idade mínima legalmente prevista nos regulamentos atuais para poder consentir com o processamento de seus dados pessoais por conta própria, sem o consentimento prévio de seus pais, responsáveis ou representantes legais.
                    </p>
                    <p>
                      Novas funcionalidades podem ser adicionadas, alteradas ou suprimidas na aplicação Canfy sem aviso prévio e liberadas nos ciclos de atualização do software, sem que isso gere para o USUÁRIO qualquer direito.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MinhaConta;
