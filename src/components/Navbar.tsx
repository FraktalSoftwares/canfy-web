import { useState, useEffect } from "react";
import { Bell, UserCircle, Key, Settings, Info, LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { filtroDestinatario } from "@/lib/notificacoes";
import logo from "@/assets/logo.svg";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Usuário");
  const [userEmail, setUserEmail] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  const [naoLidas, setNaoLidas] = useState(0);

  const navItems = [
    { name: "Dashboard", path: "/home" },
    { name: "Pacientes", path: "/pacientes" },
    { name: "Médicos", path: "/medicos" },
    { name: "Associações e marcas", path: "/associacoes" },
    { name: "Receitas", path: "/receitas" },
    { name: "Pedidos", path: "/pedidos" },
    { name: "Produtos", path: "/produtos" },
    { name: "Blog", path: "/admin/blog" },
  ];

  const fetchNaoLidas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setNaoLidas(0);
      return;
    }

    const { count, error } = await supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('lida', false)
      .or(filtroDestinatario(user.id));

    if (!error) setNaoLidas(count ?? 0);
  };

  useEffect(() => {
    fetchNaoLidas();
  }, [location.pathname]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let notifChannel: ReturnType<typeof supabase.channel> | null = null;

    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserEmail(user.email || "");

          // Buscar dados do profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome_completo, foto_perfil_url')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            setUserName(profile.nome_completo || user.email?.split('@')[0] || "Usuário");
            setUserPhoto(profile.foto_perfil_url || "");
          } else {
            setUserName(user.email?.split('@')[0] || "Usuário");
          }

          // Atualizar dados quando o próprio profile do usuário mudar
          channel = supabase
            .channel(`profile-changes-${user.id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
              },
              (payload) => {
                if (payload.new && typeof payload.new === 'object') {
                  const newData = payload.new as { nome_completo?: string; foto_perfil_url?: string };
                  if (newData.nome_completo) setUserName(newData.nome_completo);
                  if (newData.foto_perfil_url !== undefined) setUserPhoto(newData.foto_perfil_url);
                }
              }
            )
            .subscribe();

          notifChannel = supabase
            .channel('notificacoes-badge')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'notificacoes' },
              () => fetchNaoLidas()
            )
            .subscribe();
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      }
    };

    fetchUserData();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (notifChannel) supabase.removeChannel(notifChannel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/entrar");
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="border-b bg-card">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/home">
            <img src={logo} alt="Canfy" className="h-8" />
          </Link>
          
          <div className="flex gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm pb-1 border-b-2 transition-colors ${
                  location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/notificacoes" className="relative">
            <button className="p-2 hover:bg-muted rounded-lg">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {naoLidas > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </Link>

          <div className="h-6 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-muted rounded-lg p-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userPhoto} />
                <AvatarFallback className="bg-primary text-white font-medium">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-semibold">{userName}</p>
                <p className="text-xs text-muted-foreground font-normal">{userEmail}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card z-50">
              <DropdownMenuItem className="py-3 cursor-pointer" onClick={() => navigate("/minha-conta?tab=dados-basicos")}>
                <UserCircle className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="text-base">Minha conta</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="py-3 cursor-pointer" onClick={() => navigate("/minha-conta?tab=acessos")}>
                <Key className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="text-base">Acessos</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="py-3 cursor-pointer" onClick={() => navigate("/minha-conta?tab=configuracoes")}>
                <Settings className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="text-base">Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="py-3 cursor-pointer" onClick={() => navigate("/minha-conta?tab=sobre")}>
                <Info className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="text-base">Termos e política</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="py-3 cursor-pointer" onClick={handleLogout}>
                <span className="text-base font-semibold">Sair da conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
