import { revalidatePath } from 'next/cache'
import { getAdminGuides, saveGuide } from '@/app/actions/guides'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export const dynamic = 'force-dynamic'

export default async function AdminGuidesPage() {
  const guides = await getAdminGuides()

  async function saveAction(formData: FormData) {
    'use server'
    const result = await saveGuide({
      id: String(formData.get('id') ?? '').trim() || undefined,
      slug: String(formData.get('slug') ?? ''),
      title: String(formData.get('title') ?? ''),
      metaDescription: String(formData.get('meta_description') ?? ''),
      contentHtml: String(formData.get('content_html') ?? ''),
      category: String(formData.get('category') ?? ''),
      city: String(formData.get('city') ?? ''),
      status: (String(formData.get('status') ?? 'draft') as 'draft' | 'published' | 'archived'),
    })
    if (!result.ok) throw new Error(result.error ?? 'Failed to save guide')
    revalidatePath('/guides')
    revalidatePath('/admin/guides')
  }

  return (
    <main className="space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Guides</h1>
        <p className="text-sm text-muted-foreground">Create and publish SEO guides for city and neighborhood intent pages.</p>
      </header>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">New guide</h2>
        <form action={saveAction} className="mt-4 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" required placeholder="bend-first-time-homebuyers-guide" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="First Time Homebuyers Guide for Bend" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="meta_description">Meta description</Label>
            <Input id="meta_description" name="meta_description" placeholder="What to know about buying in Bend right now" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" placeholder="Buying, Selling, Neighborhoods" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" placeholder="Bend" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Input id="status" name="status" defaultValue="draft" placeholder="draft | published | archived" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content_html">Content HTML</Label>
            <Textarea id="content_html" name="content_html" required className="min-h-[260px]" />
          </div>
          <Button type="submit" className="w-full sm:w-auto">Save guide</Button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Existing guides</h2>
        <div className="mt-4 space-y-3">
          {guides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guides yet.</p>
          ) : (
            guides.map((guide) => (
              <div key={guide.id} className="rounded-md border border-border p-4">
                <p className="font-medium text-foreground">{guide.title}</p>
                <p className="text-sm text-muted-foreground">/{guide.slug} • {guide.status}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
