import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
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

const STATUS_TAG: Record<PostStatus, { label: string; bg: string; fg: string }> = {
  rascunho:  { label: "Rascunho",  bg: "hsl(var(--muted))",       fg: "hsl(var(--muted-foreground))" },
  publicado: { label: "Publicado", bg: "hsl(var(--card-green))",  fg: "hsl(var(--primary-dark))" },
  agendado:  { label: "Agendado",  bg: "hsl(var(--card-blue))",   fg: "hsl(207 89% 35%)" },
  arquivado: { label: "Arquivado", bg: "hsl(var(--card-red))",    fg: "hsl(var(--destructive))" },
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const BlogAdmin = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showDelete, setShowDelete] = useState<BlogPost | null>(null);

  const [form, setForm] = useState({
    titulo: "", slug: "", resumo: "", conteudo: "", capa_url: "",
    status: "rascunho" as PostStatus, data_publicacao: "",
  });

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openNew = () => {
    setEditing(null);
    setForm({ titulo: "", slug: "", resumo: "", conteudo: "", capa_url: "", status: "rascunho", data_publicacao: "" });
    setShowDialog(true);
  };

  const openEdit = async (post: BlogPost) => {
    const { data } = await supabase.from("blog_posts").select("conteudo").eq("id", post.id).maybeSingle();
    setEditing(post);
    setForm({
      titulo: post.titulo,
      slug: post.slug,
      resumo: post.resumo ?? "",
      conteudo: data?.conteudo ?? "",
      capa_url: post.capa_url ?? "",
      status: post.status,
      data_publicacao: post.data_publicacao
        ? format(new Date(post.data_publicacao), "yyyy-MM-dd'T'HH:mm")
        : "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.rpc("admin_upsert_blog_post", {
        p_id: editing?.id ?? null,
        p_titulo: form.titulo.trim(),
        p_slug: form.slug.trim() || slugify(form.titulo),
        p_resumo: form.resumo || null,
        p_conteudo: form.conteudo,
        p_capa_url: form.capa_url || null,
        p_status: form.status,
        p_data_publicacao: form.data_publicacao ? new Date(form.data_publicacao).toISOString() : null,
      });
      if (error) throw error;
      toast({ title: editing ? "Post atualizado" : "Post criado" });
      setShowDialog(false);
      fetchPosts();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      const { error } = await supabase.rpc("admin_delete_blog_post", { p_id: showDelete.id });
      if (error) throw error;
      toast({ title: "Post excluído" });
      setShowDelete(null);
      fetchPosts();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  const filtered = posts.filter((p) =>
    !searchQuery || p.titulo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="px-6 py-8 max-w-[1200px] mx-auto">
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
            onClick={openNew}
            className="gap-2 bg-primary text-white hover:bg-primary-dark rounded-full"
          >
            <Plus className="h-4 w-4" />
            Novo post
          </Button>
        </div>

        <div className="bg-secondary rounded-[10px] overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Posts</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-card-green border-none hover:bg-card-green">
                <TableHead className="font-semibold text-foreground">Título</TableHead>
                <TableHead className="font-semibold text-foreground">Autor</TableHead>
                <TableHead className="font-semibold text-foreground">Publicado em</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum post</TableCell></TableRow>
              ) : (
                filtered.map((post) => {
                  const tag = STATUS_TAG[post.status];
                  return (
                    <TableRow key={post.id} className="bg-card border-b border-border/40">
                      <TableCell className="font-semibold">{post.titulo}</TableCell>
                      <TableCell>{post.autor_nome ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {post.data_publicacao
                          ? format(new Date(post.data_publicacao), "dd/MM/yyyy • HH:mm", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: tag.bg, color: tag.fg }}
                          className="border-none rounded-full px-3 py-1 font-medium"
                        >
                          {tag.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(post)}>
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowDelete(post)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto p-6 [&>button]:hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                {editing ? "Editar post" : "Novo post"}
              </DialogTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Título</label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value, slug: form.slug || slugify(e.target.value) })}
                className="h-10"
                placeholder="Ex.: Cannabis medicinal e ansiedade"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                className="h-10"
                placeholder="cannabis-medicinal-ansiedade"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Resumo</label>
              <Textarea
                value={form.resumo}
                onChange={(e) => setForm({ ...form, resumo: e.target.value })}
                className="min-h-[60px] resize-none"
                placeholder="Resumo curto que aparece nos cards do blog..."
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Conteúdo (Markdown ou HTML)</label>
              <Textarea
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                className="min-h-[200px] resize-none font-mono text-sm"
                placeholder="# Título do post..."
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">URL da capa</label>
              <Input
                value={form.capa_url}
                onChange={(e) => setForm({ ...form, capa_url: e.target.value })}
                className="h-10"
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as PostStatus })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="rascunho">Rascunho</option>
                  <option value="agendado">Agendado</option>
                  <option value="publicado">Publicado</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Data publicação</label>
                <Input
                  type="datetime-local"
                  value={form.data_publicacao}
                  onChange={(e) => setForm({ ...form, data_publicacao: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-primary text-white hover:bg-primary-dark rounded-full" onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!showDelete} onOpenChange={(o) => !o && setShowDelete(null)}>
        <AlertDialogContent className="p-6 [&>button]:hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              "{showDelete?.titulo}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowDelete(null)}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-destructive text-white hover:bg-destructive/90 rounded-full" onClick={handleDelete}>
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogAdmin;
