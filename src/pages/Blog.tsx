import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Sparkles, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

interface BlogPost {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  capa_url: string | null;
  data_publicacao: string | null;
  created_at: string;
}

const BLOG_LINKS = [
  { label: "Home", href: "/" },
  { label: "Contato", href: "/#contato" },
];

const formatData = (iso: string | null) => {
  if (!iso) return "";
  try {
    return format(new Date(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return "";
  }
};

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Blog Canfy — Conhecimento sobre Cannabis Medicinal";
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, titulo, slug, resumo, capa_url, data_publicacao, created_at")
        .eq("status", "publicado")
        .order("data_publicacao", { ascending: false, nullsFirst: false });
      if (!error) setPosts((data as BlogPost[]) ?? []);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return posts;
    const q = query.toLowerCase();
    return posts.filter(
      (p) =>
        p.titulo.toLowerCase().includes(q) ||
        (p.resumo || "").toLowerCase().includes(q),
    );
  }, [posts, query]);

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar links={BLOG_LINKS} />

      {/* Header */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(50% 40% at 80% 20%, hsl(var(--card-green)) 0%, transparent 60%), radial-gradient(50% 40% at 20% 60%, hsl(var(--card-pink)) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-3xl px-6 pt-16 pb-8 text-center">
          <p className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Blog Canfy
          </p>
          <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            Conhecimento sobre Cannabis Medicinal
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Artigos, guias e novidades sobre tratamentos com cannabis medicinal, escritos por
            especialistas.
          </p>

          <div className="relative mx-auto mt-8 max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar artigos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 rounded-full border-border bg-card pl-11"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <p className="mb-6 text-sm text-muted-foreground">
          {loading
            ? "Carregando artigos..."
            : `${filtered.length} ${filtered.length === 1 ? "artigo encontrado" : "artigos encontrados"}`}
        </p>

        {!loading && filtered.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            Nenhum artigo publicado no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-[10px] bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-card-green">
                  {post.capa_url && (
                    <img
                      src={post.capa_url}
                      alt={post.titulo}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  {(post.data_publicacao || post.created_at) && (
                    <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      {formatData(post.data_publicacao || post.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary">
                    {post.titulo}
                  </h3>
                  {post.resumo && (
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.resumo}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <PublicFooter />
    </div>
  );
};

export default Blog;
