import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Pencil, Trash2, Plus, Download, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type PostStatus = "rascunho" | "publicado" | "agendado" | "arquivado";

interface PostForm {
  titulo: string;
  slug: string;
  resumo: string;
  subtitulo: string;
  capa_url: string;
  status: PostStatus;
  data_publicacao: string;
}

interface Secao {
  id: string; // ids novos usam prefixo "novo-"
  ordem: number;
  titulo: string;
  texto: string;
  imagem_url: string | null;
}

const STATUS_LABEL: Record<PostStatus, string> = {
  rascunho: "Rascunho", agendado: "Agendado", publicado: "Publicado", arquivado: "Arquivado",
};

const PUBLICACAO_TAG: Record<PostStatus, { label: string; bg: string; fg: string }> = {
  rascunho:  { label: "Imediato", bg: "hsl(var(--card-pink))", fg: "hsl(340 82% 40%)" },
  publicado: { label: "Imediato", bg: "hsl(var(--card-pink))", fg: "hsl(340 82% 40%)" },
  agendado:  { label: "Agendado", bg: "hsl(var(--card-blue))", fg: "hsl(207 89% 35%)" },
  arquivado: { label: "Imediato", bg: "hsl(var(--card-pink))", fg: "hsl(340 82% 40%)" },
};

const STATUS_TAG: Record<PostStatus, { label: string; bg: string; fg: string }> = {
  rascunho:  { label: "Pendente",  bg: "hsl(var(--card-yellow))", fg: "hsl(36 80% 38%)" },
  agendado:  { label: "Pendente",  bg: "hsl(var(--card-yellow))", fg: "hsl(36 80% 38%)" },
  publicado: { label: "Publicado", bg: "hsl(var(--card-green))",  fg: "hsl(var(--primary-dark))" },
  arquivado: { label: "Arquivado", bg: "hsl(var(--card-red))",    fg: "hsl(var(--destructive))" },
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

let novoContador = 0;
const novoSecaoId = () => `novo-${Date.now()}-${novoContador++}`;

const BlogPostAdminDetalhes = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "1");
  const [showDelete, setShowDelete] = useState(false);
  const [uploadingSecaoId, setUploadingSecaoId] = useState<string | null>(null);

  const [createdAt, setCreatedAt] = useState<string>("");
  const [form, setForm] = useState<PostForm>({
    titulo: "", slug: "", resumo: "", subtitulo: "", capa_url: "",
    status: "rascunho", data_publicacao: "",
  });
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [secoesRemovidas, setSecoesRemovidas] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const [{ data: post, error: postErr }, { data: secoesData, error: secoesErr }] = await Promise.all([
        supabase.rpc("admin_get_blog_post", { p_id: id }),
        supabase.rpc("admin_list_blog_post_secoes", { p_post_id: id }),
      ]);
      if (postErr) throw postErr;
      if (secoesErr) throw secoesErr;
      const p = post?.[0];
      if (!p) {
        toast({ title: "Post não encontrado", variant: "destructive" });
        navigate("/admin/blog");
        return;
      }
      setCreatedAt(p.created_at);
      setForm({
        titulo: p.titulo,
        slug: p.slug,
        resumo: p.resumo ?? "",
        subtitulo: p.subtitulo ?? "",
        capa_url: p.capa_url ?? "",
        status: p.status as PostStatus,
        data_publicacao: p.data_publicacao
          ? format(new Date(p.data_publicacao), "yyyy-MM-dd'T'HH:mm")
          : "",
      });
      setSecoes((secoesData ?? []).map((s: any) => ({
        id: s.id, ordem: s.ordem, titulo: s.titulo ?? "", texto: s.texto, imagem_url: s.imagem_url,
      })));
      setSecoesRemovidas([]);
    } catch (e: any) {
      toast({ title: "Erro ao carregar post", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addSecao = () => {
    setSecoes((prev) => [
      ...prev,
      { id: novoSecaoId(), ordem: prev.length, titulo: "", texto: "", imagem_url: null },
    ]);
  };

  const removeSecao = (secaoId: string) => {
    setSecoes((prev) => prev.filter((s) => s.id !== secaoId));
    if (!secaoId.startsWith("novo-")) setSecoesRemovidas((prev) => [...prev, secaoId]);
  };

  const updateSecao = (secaoId: string, patch: Partial<Secao>) => {
    setSecoes((prev) => prev.map((s) => (s.id === secaoId ? { ...s, ...patch } : s)));
  };

  const handleUploadImagem = async (secaoId: string, file: File) => {
    if (!id) return;
    setUploadingSecaoId(secaoId);
    try {
      const ext = file.name.split(".").pop();
      const path = `secoes/${id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("blog").upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("blog").getPublicUrl(path);
      updateSecao(secaoId, { imagem_url: data.publicUrl });
    } catch (e: any) {
      toast({ title: "Erro ao enviar imagem", description: e.message, variant: "destructive" });
    } finally {
      setUploadingSecaoId(null);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    if (!form.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error: postError } = await supabase.rpc("admin_upsert_blog_post", {
        p_id: id,
        p_titulo: form.titulo.trim(),
        p_slug: form.slug.trim() || slugify(form.titulo),
        p_resumo: form.resumo || null,
        p_conteudo: secoes.map((s) => s.texto).join("\n\n"),
        p_capa_url: form.capa_url || null,
        p_status: form.status,
        p_data_publicacao: form.data_publicacao ? new Date(form.data_publicacao).toISOString() : null,
        p_subtitulo: form.subtitulo || null,
      });
      if (postError) throw postError;

      await Promise.all(
        secoesRemovidas.map((secaoId) =>
          supabase.rpc("admin_delete_blog_post_secao", { p_id: secaoId })
        )
      );

      await Promise.all(
        secoes.map((secao, index) =>
          supabase.rpc("admin_upsert_blog_post_secao", {
            p_id: secao.id.startsWith("novo-") ? null : secao.id,
            p_post_id: id,
            p_ordem: index,
            p_titulo: secao.titulo || null,
            p_texto: secao.texto,
            p_imagem_url: secao.imagem_url,
          })
        )
      );

      toast({ title: "Post salvo com sucesso" });
      setIsEditing(false);
      fetchPost();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      const { error } = await supabase.rpc("admin_delete_blog_post", { p_id: id });
      if (error) throw error;
      toast({ title: "Post excluído" });
      navigate("/admin/blog");
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando post...</p>
      </div>
    );
  }

  const pubTag = PUBLICACAO_TAG[form.status];
  const statusTag = STATUS_TAG[form.status];

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/blog")}
          className="text-primary hover:bg-card-green/40 mb-3 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/admin/blog" className="hover:text-primary">Blog</Link>
          <span>&gt;</span>
          <span className="text-foreground font-medium">Detalhes do post</span>
        </nav>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Dados do post</h2>
          {!isEditing && (
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
              Editar post
            </Button>
          )}
        </div>

        <Card className="rounded-[10px] bg-secondary border-none mb-8">
          <CardContent className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge
                  style={{ backgroundColor: statusTag.bg, color: statusTag.fg }}
                  className="border-none rounded-full px-3 py-0.5 font-medium hover:opacity-90"
                >
                  {statusTag.label}
                </Badge>
                <Badge
                  style={{ backgroundColor: pubTag.bg, color: pubTag.fg }}
                  className="border-none rounded-full px-3 py-0.5 font-medium hover:opacity-90"
                >
                  {pubTag.label}
                </Badge>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setShowDelete(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-destructive hover:underline"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir post
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-1 block">Título</Label>
                  <Input
                    value={form.titulo}
                    onChange={(e) =>
                      setForm({ ...form, titulo: e.target.value, slug: form.slug || slugify(e.target.value) })
                    }
                    className="h-10 bg-card"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-1 block">Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                    className="h-10 bg-card"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-1 block">Resumo (aparece nos cards do blog)</Label>
                  <Textarea
                    value={form.resumo}
                    onChange={(e) => setForm({ ...form, resumo: e.target.value })}
                    className="min-h-[60px] resize-none bg-card"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-1 block">Subtítulo (aparece no topo do post)</Label>
                  <Textarea
                    value={form.subtitulo}
                    onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
                    className="min-h-[50px] resize-none bg-card"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-1 block">URL da capa</Label>
                  <Input
                    value={form.capa_url}
                    onChange={(e) => setForm({ ...form, capa_url: e.target.value })}
                    className="h-10 bg-card"
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold mb-1 block">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as PostStatus })}
                    >
                      <SelectTrigger className="h-10 bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-1 block">Data de publicação</Label>
                    <Input
                      type="datetime-local"
                      value={form.data_publicacao}
                      onChange={(e) => setForm({ ...form, data_publicacao: e.target.value })}
                      className="h-10 bg-card"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-foreground mb-1">{form.titulo}</h3>
                <p className="text-sm text-muted-foreground">
                  Cadastrado em {format(new Date(createdAt), "dd/MM/yyyy, 'às' HH'h'mm", { locale: ptBR })}.
                </p>
                {form.status === "agendado" && form.data_publicacao && (
                  <p className="text-sm text-muted-foreground">
                    Agendado para {format(new Date(form.data_publicacao), "dd/MM/yyyy, 'às' HH'h'mm", { locale: ptBR })}.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold text-foreground mb-4">Conteúdo</h2>

        {isEditing ? (
          <div className="space-y-4 mb-8">
            <Card className="rounded-[10px] bg-secondary border-none">
              <CardContent className="px-6 py-5">
                <Label className="text-sm font-semibold mb-1 block">Subtítulo</Label>
                <p className="text-sm text-muted-foreground">
                  Editado no card "Dados do post" acima.
                </p>
              </CardContent>
            </Card>

            {secoes.map((secao, index) => (
              <Card key={secao.id} className="rounded-[10px] bg-secondary border-none">
                <CardContent className="px-6 py-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Seção {index + 1}</p>
                    <button
                      onClick={() => removeSecao(secao.id)}
                      className="text-destructive hover:opacity-80"
                      aria-label="Remover seção"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    value={secao.titulo}
                    onChange={(e) => updateSecao(secao.id, { titulo: e.target.value })}
                    placeholder="Título da seção (opcional)"
                    className="h-10 bg-card"
                  />
                  <Textarea
                    value={secao.texto}
                    onChange={(e) => updateSecao(secao.id, { texto: e.target.value })}
                    placeholder="Texto da seção..."
                    className="min-h-[120px] resize-none bg-card"
                  />
                  {secao.imagem_url ? (
                    <div className="bg-background rounded-lg p-3 flex items-center justify-between">
                      <img src={secao.imagem_url} alt="" className="h-10 w-10 rounded object-cover" />
                      <button
                        onClick={() => updateSecao(secao.id, { imagem_url: null })}
                        className="text-destructive hover:opacity-80"
                        aria-label="Remover imagem"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline w-fit">
                      <Upload className="h-4 w-4" />
                      {uploadingSecaoId === secao.id ? "Enviando..." : "Adicionar imagem"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingSecaoId === secao.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadImagem(secao.id, file);
                        }}
                      />
                    </label>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={addSecao}
              className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full"
            >
              <Plus className="h-4 w-4" />
              Adicionar seção
            </Button>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => {
                  setIsEditing(false);
                  fetchPost();
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover rounded-full"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={["subtitulo", ...secoes.map((s) => s.id)]} className="space-y-3 mb-8">
            {form.subtitulo && (
              <AccordionItem value="subtitulo" className="rounded-[10px] bg-secondary border-none px-6">
                <AccordionTrigger className="hover:no-underline text-sm font-semibold">Subtítulo</AccordionTrigger>
                <AccordionContent className="text-sm text-foreground/90">{form.subtitulo}</AccordionContent>
              </AccordionItem>
            )}
            {secoes.length === 0 ? (
              <Card className="rounded-[10px] bg-secondary border-none">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma seção de conteúdo cadastrada.
                </CardContent>
              </Card>
            ) : (
              secoes.map((secao, index) => (
                <AccordionItem
                  key={secao.id}
                  value={secao.id}
                  className="rounded-[10px] bg-secondary border-none px-6"
                >
                  <AccordionTrigger className="hover:no-underline text-sm font-semibold">
                    {secao.titulo || `Seção ${index + 1}`}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{secao.texto}</p>
                    {secao.imagem_url && (
                      <a
                        href={secao.imagem_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-background rounded-lg p-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
                      >
                        <span className="text-sm text-primary truncate">imagem.png</span>
                        <Download className="h-4 w-4 text-primary" />
                      </a>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))
            )}
          </Accordion>
        )}
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="p-6 [&>button]:hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              "{form.titulo}" será removido permanentemente, junto com todas as suas seções.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setShowDelete(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-destructive text-white hover:bg-destructive/90 rounded-full"
              onClick={handleDelete}
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogPostAdminDetalhes;
