import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";

interface BlogPostFull {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  subtitulo: string | null;
  conteudo: string | null;
  capa_url: string | null;
  data_publicacao: string | null;
  created_at: string;
}

interface BlogPostSecao {
  id: string;
  ordem: number;
  titulo: string | null;
  texto: string;
  imagem_url: string | null;
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

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPostFull | null>(null);
  const [secoes, setSecoes] = useState<BlogPostSecao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchPost = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, titulo, slug, resumo, subtitulo, conteudo, capa_url, data_publicacao, created_at")
        .eq("slug", slug)
        .eq("status", "publicado")
        .maybeSingle();
      if (!error && data) {
        const found = data as BlogPostFull;
        setPost(found);
        document.title = `${found.titulo} — Blog Canfy`;

        const { data: secoesData } = await supabase
          .from("blog_post_secoes")
          .select("id, ordem, titulo, texto, imagem_url")
          .eq("post_id", found.id)
          .order("ordem", { ascending: true });
        setSecoes((secoesData as BlogPostSecao[]) ?? []);
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar links={BLOG_LINKS} />

      <article className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          {post && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Compartilhe</span>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${post.titulo} ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no WhatsApp"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-card-green text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Wa
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.titulo)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no X"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-card-green text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
              >
                X
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-card-green text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
              >
                f
              </a>
            </div>
          )}
        </div>

        {loading ? (
          <p className="py-12 text-muted-foreground">Carregando artigo...</p>
        ) : !post ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Artigo não encontrado.</p>
            <Link to="/blog" className="mt-4 inline-block text-primary hover:underline">
              Voltar para o blog
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {post.titulo}
            </h1>
            {post.subtitulo && <p className="mt-4 text-lg text-muted-foreground">{post.subtitulo}</p>}

            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Publicado em {formatData(post.data_publicacao || post.created_at)}
            </span>

            {post.capa_url && (
              <img
                src={post.capa_url}
                alt={post.titulo}
                className="mt-8 aspect-[16/9] w-full rounded-[10px] object-cover"
              />
            )}

            {secoes.length > 0 ? (
              <div className="mt-8 space-y-8">
                {secoes.map((secao) => (
                  <div key={secao.id}>
                    {secao.titulo && (
                      <h2 className="mb-3 inline-flex rounded-full bg-primary/10 px-3 py-1 font-display text-xl font-semibold text-primary">
                        {secao.titulo}
                      </h2>
                    )}
                    <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                      {secao.texto}
                    </div>
                    {secao.imagem_url && (
                      <img
                        src={secao.imagem_url}
                        alt={secao.titulo ?? post.titulo}
                        className="mt-4 w-full rounded-[10px] object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              post.conteudo && (
                <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                  {post.conteudo}
                </div>
              )
            )}
          </>
        )}
      </article>

      <PublicFooter />
    </div>
  );
};

export default BlogPost;
