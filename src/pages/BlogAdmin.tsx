import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type PostStatus = "rascunho" | "publicado" | "agendado" | "arquivado";

interface BlogPost {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  status: PostStatus;
  data_publicacao: string | null;
  autor_nome: string | null;
  created_at: string;
  capa_url: string | null;
}

// Badge "Publicação" (Agendado/Imediato) — como o pedido é enviado.
const PUBLICACAO_TAG: Record<PostStatus, { label: string; bg: string; fg: string }> = {
  rascunho:  { label: "Imediato", bg: "hsl(var(--card-pink))",  fg: "hsl(340 82% 40%)" },
  publicado: { label: "Imediato", bg: "hsl(var(--card-pink))",  fg: "hsl(340 82% 40%)" },
  agendado:  { label: "Agendado", bg: "hsl(var(--card-blue))",  fg: "hsl(207 89% 35%)" },
  arquivado: { label: "Imediato", bg: "hsl(var(--card-pink))",  fg: "hsl(340 82% 40%)" },
};

// Badge "Status" (Pendente/Publicado/Arquivado) — se já saiu do lado do público.
const STATUS_TAG: Record<PostStatus, { label: string; bg: string; fg: string }> = {
  rascunho:  { label: "Pendente",  bg: "hsl(var(--card-yellow))", fg: "hsl(36 80% 38%)" },
  agendado:  { label: "Pendente",  bg: "hsl(var(--card-yellow))", fg: "hsl(36 80% 38%)" },
  publicado: { label: "Publicado", bg: "hsl(var(--card-green))",  fg: "hsl(var(--primary-dark))" },
  arquivado: { label: "Arquivado", bg: "hsl(var(--card-red))",    fg: "hsl(var(--destructive))" },
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const BlogAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_list_blog_posts");
      if (error) throw error;
      setPosts((data as BlogPost[]) || []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar posts", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNovoPost = async () => {
    setCreating(true);
    try {
      const titulo = "Novo post";
      const { data, error } = await supabase.rpc("admin_upsert_blog_post", {
        p_id: null,
        p_titulo: titulo,
        p_slug: `${slugify(titulo)}-${Date.now().toString(36)}`,
        p_resumo: null,
        p_conteudo: "",
        p_capa_url: null,
        p_status: "rascunho",
        p_data_publicacao: null,
      });
      if (error) throw error;
      navigate(`/admin/blog/${data}?edit=1`);
    } catch (e: any) {
      toast({ title: "Erro ao criar post", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const filtered = posts.filter((p) =>
    !searchQuery || p.titulo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatData = (iso: string) => format(new Date(iso), "dd/MM/yyyy, HH'h'mm", { locale: ptBR });

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Blog</h1>

        <div className="flex items-center justify-between mb-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              placeholder="Buscar post..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-primary rounded-[20px] text-primary placeholder:text-primary/60"
            />
          </div>
          <Button
            onClick={handleNovoPost}
            disabled={creating}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary-hover rounded-full"
          >
            <Plus className="h-4 w-4" />
            Cadastrar post
          </Button>
        </div>

        <div className="bg-secondary rounded-[10px] overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Posts do blog</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-table-head border-none hover:bg-table-head">
                <TableHead className="font-semibold text-foreground">Título</TableHead>
                <TableHead className="font-semibold text-foreground">Data e hora de cadastro</TableHead>
                <TableHead className="font-semibold text-foreground">Publicação</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum post</TableCell></TableRow>
              ) : (
                filtered.map((post) => {
                  const pubTag = PUBLICACAO_TAG[post.status];
                  const statusTag = STATUS_TAG[post.status];
                  return (
                    <TableRow
                      key={post.id}
                      className="bg-card border-b border-border/40 hover:bg-muted/40 cursor-pointer"
                      onClick={() => navigate(`/admin/blog/${post.id}`)}
                    >
                      <TableCell className="font-semibold">{post.titulo}</TableCell>
                      <TableCell className="text-sm">{formatData(post.created_at)}</TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: pubTag.bg, color: pubTag.fg }}
                          className="border-none rounded-full px-3 py-1 font-medium hover:opacity-90"
                        >
                          {pubTag.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: statusTag.bg, color: statusTag.fg }}
                          className="border-none rounded-full px-3 py-1 font-medium hover:opacity-90"
                        >
                          {statusTag.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default BlogAdmin;
