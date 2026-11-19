import Link from "@/components/app-link";
import { BookOpen, GraduationCap, MapPinned, Newspaper, PenLine } from "lucide-react";
import { formatDate } from "@/lib/format";

export const POST_TYPE_LABEL = { GUIDE: "Guide", LEARN: "Learn", NEWS: "News", BLOG: "Blog" } as const;
export type PostTypeKey = keyof typeof POST_TYPE_LABEL;

export interface PostCardData {
  slug: string;
  title: string;
  excerpt: string | null;
  type: PostTypeKey;
  coverColor: string | null;
  readingMinutes: number | null;
  publishedAt: Date | string | null;
  tags?: string[];
}

/** Cover colors come from the CMS: only plain hex values reach a style attribute. */
export const safeColor = (c: string | null | undefined, fallback = "#3b3fa8") => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback);

const ICON = { GUIDE: MapPinned, LEARN: GraduationCap, NEWS: Newspaper, BLOG: PenLine } as const;

export function PostCover({ type, color, className }: { type: PostTypeKey; color: string | null; className?: string }) {
  const c = safeColor(color);
  const Icon = ICON[type] ?? BookOpen;
  return (
    <div className={className} style={{ background: `linear-gradient(135deg, ${c}, color-mix(in oklch, ${c}, black 35%))` }}>
      <Icon className="absolute right-4 bottom-3 size-14 text-white/15" aria-hidden />
      <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2 py-0.5 text-[0.7rem] font-semibold text-ink">{POST_TYPE_LABEL[type]}</span>
    </div>
  );
}

export function PostCard({ post, headingLevel = "h3" }: { post: PostCardData; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  return (
    <Link
      href={`/learn/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)]"
    >
      <PostCover type={post.type} color={post.coverColor} className="relative h-28 overflow-hidden" />
      <div className="flex flex-1 flex-col p-4">
        <H className="font-semibold text-balance group-hover:text-primary">{post.title}</H>
        {post.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
        <p className="mt-auto pt-3 text-xs text-muted-foreground">
          {post.publishedAt ? formatDate(post.publishedAt) : ""}
          {post.readingMinutes ? ` · ${post.readingMinutes} min read` : ""}
        </p>
      </div>
    </Link>
  );
}
