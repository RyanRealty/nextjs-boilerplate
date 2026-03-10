import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getBlogPostBySlug, getPublishedBlogPosts } from '../../actions/blog'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryanrealty.com').replace(/\/$/, '')

export const revalidate = 3600

type PageProps = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const { posts } = await getPublishedBlogPosts({ limit: 100, offset: 0 })
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post) return { title: 'Post not found' }
  const title = (post as { seo_title?: string | null }).seo_title ?? post.title
  const description = (post as { seo_description?: string | null }).seo_description ?? post.excerpt ?? undefined
  const canonical = `${siteUrl}/blog/${slug}`
  const image = (post as { hero_image_url?: string | null }).hero_image_url
  return {
    title: `${title} | Ryan Realty Blog`,
    description: description ?? undefined,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Ryan Realty Blog`,
      description: description ?? undefined,
      url: canonical,
      type: 'article',
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: post.title }] }),
    },
    twitter: { card: 'summary_large_image', title: `${title} | Ryan Realty Blog`, description: description ?? undefined },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post) notFound()

  const content = (post as { content?: string | null }).content ?? ''
  const authorSlug = (post as { author_slug?: string | null }).author_slug
  const authorName = (post as { author_name?: string | null }).author_name
  const authorPhoto = (post as { author_photo_url?: string | null }).author_photo_url
  const heroImage = (post as { hero_image_url?: string | null }).hero_image_url
  const publishedAt = (post as { published_at?: string | null }).published_at
  const category = (post as { category?: string | null }).category

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: heroImage ?? undefined,
    datePublished: publishedAt ?? undefined,
    author: authorName ? { '@type': 'Person', name: authorName } : undefined,
  }

  const { posts: related } = await getPublishedBlogPosts({ category: category ?? undefined, limit: 3, offset: 0 })
  const relatedFiltered = related.filter((p) => p.slug !== slug).slice(0, 3)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-6 text-sm text-zinc-600">
        <Link href="/blog" className="hover:text-zinc-900">Blog</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{post.title}</span>
      </nav>
      {heroImage && (
        <div className="relative aspect-[2/1] max-h-[50vh] w-full overflow-hidden rounded-xl">
          <Image src={heroImage} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" priority />
        </div>
      )}
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900">{post.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
        {authorName && (
          authorSlug ? (
            <Link href={`/team/${authorSlug}`} className="hover:text-zinc-700">{authorName}</Link>
          ) : (
            <span>{authorName}</span>
          )
        )}
        {publishedAt && <time dateTime={publishedAt}>{new Date(publishedAt).toLocaleDateString('en-US')}</time>}
        {category && <span className="rounded bg-zinc-100 px-2 py-0.5">{category}</span>}
      </div>
      <div
        className="prose prose-zinc mt-8 max-w-none prose-headings:font-semibold prose-a:text-[var(--brand-navy)]"
        dangerouslySetInnerHTML={{ __html: content || '<p>No content yet.</p>' }}
      />
      {authorName && (
        <section className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50/50 p-6" aria-labelledby="author-heading">
          <h2 id="author-heading" className="text-lg font-semibold text-zinc-900">About the author</h2>
          <div className="mt-3 flex items-center gap-4">
            {authorPhoto && (
              <Image src={authorPhoto} alt="" width={64} height={64} className="rounded-full object-cover" />
            )}
            <div>
              <p className="font-medium text-zinc-900">{authorName}</p>
              {authorSlug && (
                <Link href={`/team/${authorSlug}`} className="text-sm text-[var(--brand-navy)] hover:underline">
                  View {authorName}&apos;s listings
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
      {relatedFiltered.length > 0 && (
        <section className="mt-12" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-lg font-semibold text-zinc-900">Related posts</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {relatedFiltered.map((p) => (
              <li key={p.id}>
                <Link href={`/blog/${p.slug}`} className="block rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50">
                  <span className="font-medium text-zinc-900">{p.title}</span>
                  {p.published_at && <span className="ml-2 text-sm text-zinc-500">{new Date(p.published_at).toLocaleDateString('en-US')}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-12 rounded-xl border border-zinc-200 bg-[var(--brand-cream)]/30 p-6 text-center">
        <p className="font-medium text-zinc-900">Get market updates</p>
        <p className="mt-1 text-sm text-zinc-600">Stay in the loop with local market insights.</p>
        <Link href="/contact" className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Contact us
        </Link>
      </div>
    </main>
  )
}
