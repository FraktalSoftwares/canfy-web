import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, LogOut, ArrowLeft, Check, User, Mail, Phone, Lock, Plus, RotateCw, ChevronRight, Trash2, X, Upload, History } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Usuario {
  id: string;
  nome_completo: string;
  email: string;
  foto_perfil_url: string | null;
  ativo?: boolean;
  role?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  gestor: "Gestor",
  visualizador: "Visualizador",
};

type PermissoesMap = {
  acessos: { acessar: boolean; editar: boolean };
  usuarios: { acessar: boolean; editar: boolean };
  receitas: { acessar: boolean; editar: boolean };
  produtos: { acessar: boolean; editar: boolean };
  associacoes: { acessar: boolean; editar: boolean };
};

const permissoesVazias = (): PermissoesMap => ({
  acessos: { acessar: false, editar: false },
  usuarios: { acessar: false, editar: false },
  receitas: { acessar: false, editar: false },
  produtos: { acessar: false, editar: false },
  associacoes: { acessar: false, editar: false },
});

type ModuloDef = {
  key: keyof PermissoesMap;
  label: string;
  acessarLabel: string;
  editarLabel: string;
};

const MODULOS: ModuloDef[] = [
  { key: 'acessos', label: 'Acessos', acessarLabel: 'Acessar módulo de acessos', editarLabel: 'Editar permissões' },
  { key: 'usuarios', label: 'Usuários', acessarLabel: 'Acessar módulo de usuários', editarLabel: 'Editar dados dos usuários' },
  { key: 'receitas', label: 'Receitas e pedidos', acessarLabel: 'Acessar receitas e pedidos', editarLabel: 'Editar receitas e pedidos' },
  { key: 'produtos', label: 'Catálogo de produtos', acessarLabel: 'Acessar catálogo de produtos', editarLabel: 'Editar catálogo de produtos' },
  { key: 'associacoes', label: 'Associações/marcas', acessarLabel: 'Acessar associações/marcas', editarLabel: 'Editar associações/marcas' },
];

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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserData, setSelectedUserData] = useState<Usuario | null>(null);
  const [adicionarUsuarioOpen, setAdicionarUsuarioOpen] = useState(false);
  const [novoUsuarioNome, setNovoUsuarioNome] = useState("");
  const [novoUsuarioEmail, setNovoUsuarioEmail] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(false);
  const { toast } = useToast();
  
  // Permissões do usuário atualmente selecionado para edição
  const [permissoes, setPermissoes] = useState<PermissoesMap>(permissoesVazias());
  const [isLoadingPermissoes, setIsLoadingPermissoes] = useState(false);
  const [isSavingPermissoes, setIsSavingPermissoes] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Permissões para novo usuário
  const [novoUsuarioPermissoes, setNovoUsuarioPermissoes] = useState<PermissoesMap>(permissoesVazias());
  
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

  // Buscar usuários do sistema via edge function (resolve email real de auth.users)
  const fetchUsuarios = async () => {
    setIsLoadingUsuarios(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const callerId = authData.user?.id ?? null;

      const { data, error } = await supabase.functions.invoke('admin-list-users');
      if (error) throw error;

      const lista: Usuario[] = (data?.usuarios ?? [])
        .filter((u: Usuario) => u.id !== callerId)
        .map((u: Usuario) => ({
          id: u.id,
          nome_completo: u.nome_completo,
          email: u.email || 'Email não disponível',
          foto_perfil_url: u.foto_perfil_url,
          ativo: u.ativo,
          role: u.role,
        }));

      setUsuarios(lista);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: error?.message || "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsuarios(false);
    }
  };

  // Carrega permissões do usuário selecionado para edição
  const loadPermissoesUsuario = async (targetUserId: string) => {
    setIsLoadingPermissoes(true);
    setPermissoes(permissoesVazias());
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('modulo, pode_acessar, pode_editar')
        .eq('user_id', targetUserId);

      if (error) throw error;

      const novas = permissoesVazias();
      (data ?? []).forEach((p) => {
        const mod = p.modulo as keyof PermissoesMap;
        if (mod in novas) {
          novas[mod] = { acessar: !!p.pode_acessar, editar: !!p.pode_editar };
        }
      });
      setPermissoes(novas);
    } catch (error: any) {
      console.error('Erro ao carregar permissões:', error);
      toast({
        title: "Erro ao carregar permissões",
        description: error?.message || "Não foi possível carregar as permissões do usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPermissoes(false);
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
    if (!selectedUser) return;

    setIsSavingPermissoes(true);
    try {
      const payloadPerms: Record<string, { pode_acessar: boolean; pode_editar: boolean }> = {};
      (Object.entries(permissoes) as [keyof PermissoesMap, PermissoesMap[keyof PermissoesMap]][]).forEach(
        ([modulo, perms]) => {
          payloadPerms[modulo] = { pode_acessar: perms.acessar, pode_editar: perms.editar };
        },
      );

      const { data, error } = await supabase.functions.invoke('admin-update-user-permissions', {
        body: { user_id: selectedUser, permissoes: payloadPerms },
      });

      if (error || (data && (data as any).error)) {
        throw new Error(error?.message || (data as any)?.detail || (data as any)?.error || 'Erro desconhecido');
      }

      toast({
        title: "Permissões atualizadas!",
        description: "As permissões foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar permissões",
        description: error?.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPermissoes(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsDeletingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: selectedUser },
      });
      if (error || (data && (data as any).error)) {
        throw new Error(error?.message || (data as any)?.detail || (data as any)?.error || 'Erro desconhecido');
      }

      toast({
        title: "Usuário removido",
        description: `${selectedUserData?.nome_completo ?? 'Usuário'} foi desativado.`,
      });

      setUsuarios((prev) => prev.filter((u) => u.id !== selectedUser));
      setSelectedUser(null);
      setSelectedUserData(null);
      setPermissoes(permissoesVazias());
      setConfirmDeleteOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir usuário",
        description: error?.message || "Não foi possível excluir o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingUser(false);
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
          <Button
            variant="ghost"
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
              } else if (selectedUser) {
                setSelectedUser(null);
                setSelectedUserData(null);
                setPermissoes(permissoesVazias());
              } else {
                navigate(-1);
              }
            }}
            className="gap-2 text-primary hover:text-primary-dark hover:bg-transparent p-0"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar
          </Button>

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
                  ? 'bg-primary text-primary-foreground hover:bg-primary-hover border-primary'
                  : 'border-primary text-primary hover:bg-primary/10'
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

          {activeTab === "acessos" && (
            <Button
              variant="outline"
              onClick={() => setAdicionarUsuarioOpen(true)}
              className="gap-2 rounded-full border-primary text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" />
              Adicionar usuário
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8 bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0">
            <TabsTrigger 
              value="dados-basicos" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground px-6 pb-3 font-semibold text-base"
            >
              Dados básicos
            </TabsTrigger>
            <TabsTrigger 
              value="acessos" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground px-6 pb-3 font-normal text-base text-muted-foreground"
            >
              Acessos
            </TabsTrigger>
            <TabsTrigger 
              value="configuracoes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground px-6 pb-3 font-normal text-base text-muted-foreground"
            >
              Configurações
            </TabsTrigger>
            <TabsTrigger 
              value="sobre" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground px-6 pb-3 font-normal text-base text-muted-foreground"
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
                            className="absolute bottom-0 right-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary-hover cursor-pointer"
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
                          <PasswordInput
                            id="senha-atual"
                            placeholder="Insira sua senha atual"
                            value={senhaAtual}
                            onChange={(e) => setSenhaAtual(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nova-senha">Nova senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <PasswordInput
                            id="nova-senha"
                            placeholder="Insira sua nova senha"
                            value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <PasswordInput
                            id="confirmar-senha"
                            placeholder="Confirme sua nova senha"
                            value={confirmarSenha}
                            onChange={(e) => setConfirmarSenha(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          variant="outline"
                          onClick={handleUpdatePassword}
                          disabled={isUpdatingPassword}
                          className="rounded-full border-primary text-primary hover:bg-primary/10"
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
                        className="rounded-full border-primary text-primary hover:bg-primary/10"
                      >
                        Ver termos de uso
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/politica-privacidade")}
                        className="rounded-full border-primary text-primary hover:bg-primary/10"
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">Acessos</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg bg-[#f7f7f5] hover:bg-[#ececea]"
                aria-label="Histórico"
              >
                <History className="h-5 w-5 text-muted-foreground" />
              </Button>
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
                        <AccordionTrigger className="bg-[#3f3f3d] text-white hover:bg-[#2f2f2d] px-4 py-3 rounded-lg hover:no-underline data-[state=open]:bg-[#3f3f3d] [&>svg]:text-white">
                          Acessos
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-4">
                          <p className="text-sm text-muted-foreground">Configurações de acessos...</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="usuarios" className="border-none">
                        <AccordionTrigger className="bg-[#3f3f3d] text-white hover:bg-[#2f2f2d] px-4 py-3 rounded-lg hover:no-underline data-[state=open]:bg-[#3f3f3d] [&>svg]:text-white">
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
                        <AccordionTrigger className="bg-[#3f3f3d] text-white hover:bg-[#2f2f2d] px-4 py-3 rounded-lg hover:no-underline data-[state=open]:bg-[#3f3f3d] [&>svg]:text-white">
                          Receitas e pedidos
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-4">
                          <p className="text-sm text-muted-foreground">Configurações de receitas...</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="catalogo" className="border-none">
                        <AccordionTrigger className="bg-[#3f3f3d] text-white hover:bg-[#2f2f2d] px-4 py-3 rounded-lg hover:no-underline data-[state=open]:bg-[#3f3f3d] [&>svg]:text-white">
                          Catálogo de produtos
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-4">
                          <p className="text-sm text-muted-foreground">Configurações de catálogo...</p>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="associacoes" className="border-none">
                        <AccordionTrigger className="bg-[#3f3f3d] text-white hover:bg-[#2f2f2d] px-4 py-3 rounded-lg hover:no-underline data-[state=open]:bg-[#3f3f3d] [&>svg]:text-white">
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
                      className="flex-1 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground"
                      onClick={handleCadastrarNovoUsuario}
                    >
                      Concluir cadastro
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className={`grid gap-6 ${selectedUser && selectedUserData ? 'grid-cols-12' : 'grid-cols-1'}`}>
              {/* Lista de usuários */}
              <div className={selectedUser && selectedUserData ? "col-span-5" : ""}>
                {isLoadingUsuarios ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando usuários...
                  </div>
                ) : usuarios.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {usuarios.map((usuario) => {
                      const isSelected = selectedUser === usuario.id;
                      return (
                        <button
                          key={usuario.id}
                          onClick={() => {
                            setSelectedUser(usuario.id);
                            setSelectedUserData(usuario);
                            loadPermissoesUsuario(usuario.id);
                          }}
                          className={`flex h-20 w-full items-center justify-between rounded-2xl px-8 py-7 text-left transition-colors ${
                            isSelected ? 'bg-[#ececea] ring-1 ring-primary/40' : 'bg-[#f7f7f5] hover:bg-[#ececea]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base font-semibold text-[#3f3f3d]">
                              {usuario.nome_completo}
                            </span>
                            {usuario.role && (
                              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                {ROLE_LABELS[usuario.role] ?? usuario.role}
                              </span>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Detalhes e permissões do usuário */}
              {selectedUser && selectedUserData && (
                <div className="col-span-7">
                  <div className="rounded-xl bg-[#f7f7f5] p-8">
                    <div className="flex flex-col gap-6">
                      {/* Info do usuário */}
                      <div className="flex items-center gap-4">
                        <Avatar className="h-[52px] w-[52px]">
                          <AvatarImage src={selectedUserData.foto_perfil_url || ""} />
                          <AvatarFallback className="bg-primary text-white font-medium text-lg">
                            {selectedUserData.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground leading-tight">
                            {selectedUserData.nome_completo}
                          </h3>
                          <p className="text-sm text-primary">
                            {selectedUserData.email}
                          </p>
                        </div>
                      </div>

                      {/* Permissões */}
                      <div className="border-t border-[#d6d6d3] pt-6">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-base font-semibold text-[#3f3f3d]">Permissões</h4>
                          {(isLoadingPermissoes || isSavingPermissoes) && (
                            <span className="text-xs text-muted-foreground">
                              {isSavingPermissoes ? 'Salvando...' : 'Carregando...'}
                            </span>
                          )}
                        </div>

                        <Accordion type="multiple" className="space-y-0">
                          {MODULOS.map((mod) => {
                            const perm = permissoes[mod.key];
                            const todosMarcados = perm.acessar && perm.editar;
                            const setMod = (next: { acessar: boolean; editar: boolean }) =>
                              setPermissoes({ ...permissoes, [mod.key]: next });
                            return (
                              <AccordionItem
                                key={mod.key}
                                value={mod.key}
                                className="border border-[#d6d6d3] data-[state=open]:bg-card bg-card overflow-hidden first:rounded-t-xl last:rounded-b-xl -mt-px first:mt-0"
                              >
                                <AccordionTrigger className="bg-[#3f3f3d] text-white hover:bg-[#2f2f2d] px-5 py-4 rounded-none hover:no-underline data-[state=open]:bg-[#3f3f3d] [&>svg]:text-white">
                                  <span className="text-base font-semibold">{mod.label}</span>
                                </AccordionTrigger>
                                <AccordionContent className="px-5 py-4 bg-card">
                                  <div className="flex items-center gap-3 pr-3">
                                    <Checkbox
                                      id={`${mod.key}-selecionar-tudo`}
                                      checked={todosMarcados}
                                      onCheckedChange={(checked) =>
                                        setMod({ acessar: checked as boolean, editar: checked as boolean })
                                      }
                                    />
                                    <label
                                      htmlFor={`${mod.key}-selecionar-tudo`}
                                      className="text-sm font-semibold leading-none text-[#7c7c79] cursor-pointer"
                                    >
                                      Selecionar tudo
                                    </label>
                                  </div>
                                  <div className="my-3 h-px bg-[#d6d6d3]" />
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3 pr-3">
                                      <Checkbox
                                        id={`${mod.key}-acessar`}
                                        checked={perm.acessar}
                                        onCheckedChange={(checked) =>
                                          setMod({ ...perm, acessar: checked as boolean })
                                        }
                                      />
                                      <label
                                        htmlFor={`${mod.key}-acessar`}
                                        className="text-sm font-semibold leading-none text-[#7c7c79] cursor-pointer"
                                      >
                                        {mod.acessarLabel}
                                      </label>
                                    </div>
                                    <div className="flex items-center gap-3 pr-3">
                                      <Checkbox
                                        id={`${mod.key}-editar`}
                                        checked={perm.editar}
                                        onCheckedChange={(checked) =>
                                          setMod({ ...perm, editar: checked as boolean })
                                        }
                                      />
                                      <label
                                        htmlFor={`${mod.key}-editar`}
                                        className="text-sm font-semibold leading-none text-[#7c7c79] cursor-pointer"
                                      >
                                        {mod.editarLabel}
                                      </label>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </div>

                      {/* Footer: salvar + excluir */}
                      <div className="flex items-center justify-between gap-3">
                        <Button
                          variant="ghost"
                          onClick={() => setConfirmDeleteOpen(true)}
                          disabled={isSavingPermissoes || isDeletingUser}
                          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full px-4"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir usuário
                        </Button>

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => {
                              setSelectedUser(null);
                              setSelectedUserData(null);
                              setPermissoes(permissoesVazias());
                            }}
                            disabled={isSavingPermissoes}
                          >
                            Cancelar
                          </Button>
                          <Button
                            className="rounded-full bg-primary hover:bg-primary-hover text-primary-foreground"
                            onClick={handleSavePermissions}
                            disabled={isSavingPermissoes || isLoadingPermissoes}
                          >
                            {isSavingPermissoes ? "Salvando..." : "Salvar alterações"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar exclusão */}
            <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {selectedUserData
                      ? `Essa ação desativa ${selectedUserData.nome_completo} no sistema. Você poderá reativar depois pelo banco de dados.`
                      : 'Essa ação desativa o usuário no sistema.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingUser}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteUser}
                    disabled={isDeletingUser}
                    className="bg-destructive hover:bg-destructive/90 text-white"
                  >
                    {isDeletingUser ? "Excluindo..." : "Excluir"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                  className="gap-2 bg-card text-primary border border-primary hover:bg-primary/10 rounded-full"
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
                  <h3 className="text-lg font-bold text-primary mb-4">1. Introdução</h3>
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
                  <h3 className="text-lg font-bold text-primary mb-4">2. Informações gerais</h3>
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
                  <h3 className="text-lg font-bold text-primary mb-4">3. Sobre a aplicação Canfy</h3>
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
