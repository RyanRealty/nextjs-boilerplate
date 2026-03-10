import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getPublishedBlogPosts, getPopularBlogSlugs, getBlogCategories } from '../actions/blog'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryanrealty.com').replace(/\/$/, '')

export const metadata: Metadata = {
  title: 'Central Oregon Real Estate Blog | Market Insights & Guides | Ryan Realty',
  description: 'Market reports, community guides, and tips for buying and selling in Central Oregon.',
  alternates: { canonical: `${siteUrl}/blog` },
  openGraph: {
    title: 'Central Oregon Real Estate Blog | Ryan Realty',
    url: `${siteUrl}/blog`,
    type: 'website',
  },
}

function estimateReadTime(content: string | null): number {
  if (!content) return 2
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

type PageProps = { searchParams: Promise<{ category?: string; page?: string }> }

export default async function BlogIndexPage({ searchParams }: PageProps) {
  const params = await searchParams
  const category = params.category ?? 'All'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * 12
  const [categories, { posts, total }, popularSlugs] = await Promise.all([
    getBlogCategories(),
    getPublishedBlogPosts({ category: category === 'All' ? null : category, limit: 12, offset }),
    getPopularBlogSlugs(5),
  ])
  const totalPages = Math.ceil(total / 12)
  const featured = posts[0]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Central Oregon Real Estate Blog | Ryan Realty',
    url: `${siteUrl}/blog`,
    description: 'Market insights and guides for Central Oregon real estate.',
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-bold text-zinc-900">Blog</h1>
      <p className="mt-2 text-zinc-600">
        Market insights, community guides, and tips for buying and selling in Central Oregon.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Categories">
        {categories.map((cat) => (
          <Link
            key={cat}
            href={cat === 'All' ? '/blog' : `/blog?category=${encodeURIComponent(cat)}`}
            className={`rounded-full px-4 py-2 text-sm font-medium ${category === cat ? 'bg-[var(--brand-navy)] text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
          >
            {cat}
          </Link>
        ))}
      </nav>

      {featured && page === 1 && (
        <article className="mt-8">
          <Link href={`/blog/${featured.slug}`} className="block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
            {featured.hero_image_url && (
              <div className="relative aspect-[2/1] w-full">
                <Image src={featured.hero_image_url} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 1024px" />
              </div>
            )}
            <div className="p-6">
              {featured.category && <span className="text-xs font-medium uppercase text-zinc-500">{featured.category}</span>}
              <h2 className="mt-2 text-2xl font-bold text-zinc-900">{featured.title}</h2>
              {featured.excerpt && <p className="mt-2 line-clamp-2 text-zinc-600">{featured.excerpt}</p>}
              <div className="mt-3 flex items-center gap-3 text-sm text-zinc-500">
                {featured.author_name && <span>{featured.author_name}</span>}
                {featured.published_at && <time dateTime={featured.published_at}>{new Date(featured.published_at).toLocaleDateString('en-US')}</time>}
              </div>
            </div>
          </Link>
        </article>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(page === 1 ? posts.slice(1) : posts).map((post) => (
          <article key={post.id}>
            <Link href={`/blog/${post.slug}`} className="block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
              {post.hero_image_url && (
                <div className="relative aspect-[16/10] w-full">
                  <Image src={post.hero_image_url} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                </div>
              )}
              <div className="p-4">
                {post.category && <span className="text-xs font-medium uppercase text-zinc-500">{post.category}</span>}
                <h2 className="mt-1 text-lg font-semibold text-zinc-900 line-clamp-2">{post.title}</h2>
                {post.excerpt && <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{post.excerpt}</p>}
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                  {post.author_name && <span>{post.author_name}</span>}
                  {post.published_at && <time dateTime={post.published_at}>{new Date(post.published_at).toLocaleDateString('en-US')}</time>}
                  <span>{estimateReadTime(null)} min read</span>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="mt-10 flex justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Link href={`/blog?page=${page - 1}${category !== 'All' ? `&category=${encodeURIComponent(category)}` : ''}`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50">
              Previous
            </Link>
          )}
          <span className="flex items-center px-4 py-2 text-sm text-zinc-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/blog?page=${page + 1}${category !== 'All' ? `&category=${encodeURIComponent(category)}` : ''}`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50">
              Next
            </Link>
          )}
        </nav>
      )}

      <aside className="mt-12 border-t border-zinc-200 pt-8">
        <h3 className="text-sm font-semibold text-zinc-900">Popular posts</h3>
        <ul className="mt-2 space-y-2">
          {popularSlugs.slice(0, 5).map((slug) => (
            <li key={slug}>
              <Link href={`/blog/${slug}`} className="text-sm text-[var(--brand-navy)] hover:underline">
                {slug.replace(/-/g, ' ')}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  )
}
