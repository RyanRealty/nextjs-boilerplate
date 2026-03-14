'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { BrokerRow } from '@/app/actions/brokers'
import { updateBroker, deleteBroker } from '@/app/actions/brokers'
import {
  uploadBrokerHeadshot,
  generateBrokerHeadshot,
  uploadBrokerIntroVideo,
  checkReplicateConfigured,
  addBrokerSavedHeadshot,
  setBrokerHeadshotDefault,
} from '@/app/actions/broker-headshot'
import {
  listHeadshotPrompts,
  createHeadshotPrompt,
  updateHeadshotPrompt,
  deleteHeadshotPrompt,
  type HeadshotPromptOption,
} from '@/app/actions/headshot-prompts'
import type { HeadshotGender } from '@/lib/headshot-prompt'
import { checkSynthesiaConfigured } from '@/app/actions/synthesia'
import { DEFAULT_INTRO_PROMPT, SYNTHESIA_AVATAR_OPTIONS } from '@/lib/synthesia-constants'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import {
  generateAndSaveSynthesiaIntroVideo,
  listBrokerGeneratedMedia,
  updateBrokerGeneratedMedia,
  deleteBrokerGeneratedMedia,
  setBrokerIntroVideoFromGenerated,
  type BrokerGeneratedMediaRow,
} from '@/app/actions/broker-generated-media'

type Props = {
  broker: BrokerRow
  initialGeneratedMedia?: BrokerGeneratedMediaRow[]
  className?: string
}

export default function AdminBrokerForm({ broker, initialGeneratedMedia = [], className = '' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [headshotUploading, setHeadshotUploading] = useState(false)
  const [headshotGenerating, setHeadshotGenerating] = useState(false)
  const [introVideoUploading, setIntroVideoUploading] = useState(false)
  const [synthesiaGenerating, setSynthesiaGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [replicateConfigured, setReplicateConfigured] = useState<boolean | null>(null)
  const [synthesiaConfigured, setSynthesiaConfigured] = useState<boolean | null>(null)
  const [generatedMedia, setGeneratedMedia] = useState<BrokerGeneratedMediaRow[]>(initialGeneratedMedia)
  const [synthesiaPrompt, setSynthesiaPrompt] = useState(DEFAULT_INTRO_PROMPT)
  const [synthesiaAvatarId, setSynthesiaAvatarId] = useState(SYNTHESIA_AVATAR_OPTIONS[0]?.id ?? '')
  const [synthesiaSetAsIntro, setSynthesiaSetAsIntro] = useState(true)
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null)
  const [editingMediaTitle, setEditingMediaTitle] = useState('')
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState<string | null>(null)
  const [savedHeadshots, setSavedHeadshots] = useState<string[]>(broker.saved_headshot_urls ?? [])
  const [promptOptions, setPromptOptions] = useState<HeadshotPromptOption[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<string>('default')
  const [managePromptsOpen, setManagePromptsOpen] = useState(false)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [editingPromptForm, setEditingPromptForm] = useState({ name: '', body: '' })
  const [newPromptForm, setNewPromptForm] = useState({ name: '', body: '' })
  const [promptMessage, setPromptMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [promptsLoading, setPromptsLoading] = useState(false)
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false)
  const [headshotLightboxUrl, setHeadshotLightboxUrl] = useState<string | null>(null)
  const headshotFileRef = useRef<HTMLInputElement>(null)
  const aiSourceFileRef = useRef<HTMLInputElement>(null)
  const headshotGenderRef = useRef<HTMLSelectElement>(null)
  const introVideoFileRef = useRef<HTMLInputElement>(null)
  const headshotSectionRef = useRef<HTMLDivElement>(null)
  const generatedPreviewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    checkReplicateConfigured().then((r) => setReplicateConfigured(r.configured))
  }, [])
  useEffect(() => {
    checkSynthesiaConfigured().then((r) => setSynthesiaConfigured(r.configured))
  }, [])
  useEffect(() => {
    setGeneratedMedia(initialGeneratedMedia)
  }, [initialGeneratedMedia])
  async function loadPrompts() {
    const gender = (headshotGenderRef.current?.value ?? 'Male') as HeadshotGender
    const list = await listHeadshotPrompts(gender)
    setPromptOptions(list)
  }
  useEffect(() => {
    loadPrompts()
  }, [])
  // When a new headshot is generated, scroll it into view so the user sees the result
  useEffect(() => {
    if (generatedPreviewUrl && generatedPreviewRef.current) {
      generatedPreviewRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [generatedPreviewUrl])
  const [form, setForm] = useState({
    display_name: broker.display_name,
    title: broker.title,
    license_number: broker.license_number ?? '',
    bio: broker.bio ?? '',
    photo_url: broker.photo_url ?? '',
    email: broker.email ?? '',
    phone: broker.phone ?? '',
    google_review_url: broker.google_review_url ?? '',
    zillow_review_url: broker.zillow_review_url ?? '',
    sort_order: broker.sort_order,
    is_active: broker.is_active,
    tagline: broker.tagline ?? '',
    specialties: (broker.specialties ?? []).join(', '),
    designations: (broker.designations ?? []).join(', '),
    years_experience: broker.years_experience ?? '',
    social_instagram: broker.social_instagram ?? '',
    social_facebook: broker.social_facebook ?? '',
    social_linkedin: broker.social_linkedin ?? '',
    social_youtube: broker.social_youtube ?? '',
    social_tiktok: broker.social_tiktok ?? '',
    intro_video_url: broker.intro_video_url ?? '',
  })

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      const specialties = form.specialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const designations = form.designations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const yearsNum = typeof form.years_experience === 'number' ? form.years_experience : parseInt(String(form.years_experience), 10)
      const result = await updateBroker(broker.id, {
        display_name: form.display_name.trim() || undefined,
        title: form.title.trim() || undefined,
        license_number: form.license_number.trim() || null,
        bio: form.bio.trim() || null,
        photo_url: form.photo_url.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        google_review_url: form.google_review_url.trim() || null,
        zillow_review_url: form.zillow_review_url.trim() || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
        tagline: form.tagline.trim() || null,
        specialties: specialties.length > 0 ? specialties : null,
        designations: designations.length > 0 ? designations : null,
        years_experience: Number.isFinite(yearsNum) && yearsNum > 0 ? yearsNum : null,
        social_instagram: form.social_instagram.trim() || null,
        social_facebook: form.social_facebook.trim() || null,
        social_linkedin: form.social_linkedin.trim() || null,
        social_youtube: form.social_youtube.trim() || null,
        social_tiktok: form.social_tiktok.trim() || null,
        intro_video_url: form.intro_video_url.trim() || null,
      })
      if (result.ok) {
        setMessage({ type: 'ok', text: 'Broker updated.' })
        router.refresh()
        return
      }
      const errText = result.error ?? ''
      const friendly = /failed to fetch|load failed|networkerror/i.test(errText)
        ? 'Network error. Check your connection and that the dev server is running (npm run dev).'
        : errText
      setMessage({ type: 'err', text: friendly })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const friendly = /failed to fetch|load failed|networkerror/i.test(msg)
        ? 'Network error. Check your connection and that the dev server is running (npm run dev).'
        : msg
      setMessage({ type: 'err', text: friendly })
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove broker "${broker.display_name}"? This cannot be undone.`)) return
    setMessage(null)
    setLoading(true)
    const result = await deleteBroker(broker.id)
    setLoading(false)
    if (result.ok) router.push('/admin/brokers')
    else setMessage({ type: 'err', text: result.error })
  }

  async function handleUploadHeadshot() {
    setMessage(null)
    const fileInput = headshotFileRef.current
    const file = fileInput?.files?.[0]
    if (!file) {
      setMessage({ type: 'err', text: 'Please choose an image file.' })
      return
    }
    setHeadshotUploading(true)
    const formData = new FormData()
    formData.set('file', file)
    const result = await uploadBrokerHeadshot(broker.id, formData)
    setHeadshotUploading(false)
    if (result.ok) {
      setForm((f) => ({ ...f, photo_url: result.url }))
      setMessage({ type: 'ok', text: 'Headshot uploaded and set as broker photo.' })
      router.refresh()
      if (fileInput) fileInput.value = ''
    } else {
      setMessage({ type: 'err', text: result.error })
    }
  }

  async function handleGenerateHeadshot() {
    setMessage(null)
    const fileInput = aiSourceFileRef.current
    const genderSelect = headshotGenderRef.current
    const file = fileInput?.files?.[0]
    const gender = (genderSelect?.value ?? 'Male') as HeadshotGender
    if (!file) {
      setMessage({ type: 'err', text: 'Please choose a source photo.' })
      return
    }
    setHeadshotGenerating(true)
    setGeneratedPreviewUrl(null)
    headshotSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const formData = new FormData()
    formData.set('file', file)
    const result = await generateBrokerHeadshot(broker.id, formData, gender, selectedPromptId)
    setHeadshotGenerating(false)
    if (result.ok) {
      setGeneratedPreviewUrl(result.url)
      setMessage({ type: 'ok', text: 'Headshot generated. Set as default, save, or generate another.' })
      if (fileInput) fileInput.value = ''
    } else {
      setMessage({ type: 'err', text: result.error ?? 'Generation failed' })
    }
  }

  async function handleSetGeneratedAsDefault() {
    if (!generatedPreviewUrl) return
    setMessage(null)
    const result = await setBrokerHeadshotDefault(broker.id, generatedPreviewUrl)
    if (result.ok) {
      setForm((f) => ({ ...f, photo_url: generatedPreviewUrl }))
      setSavedHeadshots((prev) => (prev.includes(generatedPreviewUrl) ? prev : [...prev, generatedPreviewUrl]))
      setGeneratedPreviewUrl(null)
      setMessage({ type: 'ok', text: 'Set as default photo. It will appear on the site.' })
      router.refresh()
    } else {
      setMessage({ type: 'err', text: result.error })
    }
  }

  async function handleSaveGenerated() {
    if (!generatedPreviewUrl) return
    setMessage(null)
    const result = await addBrokerSavedHeadshot(broker.id, generatedPreviewUrl)
    if (result.ok) {
      setSavedHeadshots((prev) => (prev.includes(generatedPreviewUrl) ? prev : [...prev, generatedPreviewUrl]))
      setGeneratedPreviewUrl(null)
      setMessage({ type: 'ok', text: 'Saved. You can set it as default later from the list below.' })
      router.refresh()
    } else {
      setMessage({ type: 'err', text: result.error })
    }
  }

  async function handleSetSavedAsDefault(url: string) {
    setMessage(null)
    const result = await setBrokerHeadshotDefault(broker.id, url)
    if (result.ok) {
      setForm((f) => ({ ...f, photo_url: url }))
      setMessage({ type: 'ok', text: 'Default photo updated.' })
      router.refresh()
    } else {
      setMessage({ type: 'err', text: result.error })
    }
  }

  async function handleCreatePrompt() {
    setPromptMessage(null)
    if (!newPromptForm.name.trim()) {
      setPromptMessage({ type: 'err', text: 'Enter a name for the prompt.' })
      return
    }
    setPromptsLoading(true)
    const result = await createHeadshotPrompt({ name: newPromptForm.name.trim(), body: newPromptForm.body.trim() })
    setPromptsLoading(false)
    if (result.ok) {
      setNewPromptForm({ name: '', body: '' })
      setPromptMessage({ type: 'ok', text: 'Prompt saved.' })
      await loadPrompts()
      setSelectedPromptId(result.id)
    } else {
      setPromptMessage({ type: 'err', text: result.error })
    }
  }

  async function handleUpdatePrompt() {
    if (!editingPromptId) return
    setPromptMessage(null)
    if (!editingPromptForm.name.trim()) {
      setPromptMessage({ type: 'err', text: 'Enter a name for the prompt.' })
      return
    }
    setPromptsLoading(true)
    const result = await updateHeadshotPrompt(editingPromptId, {
      name: editingPromptForm.name.trim(),
      body: editingPromptForm.body.trim(),
    })
    setPromptsLoading(false)
    if (result.ok) {
      setEditingPromptId(null)
      setEditingPromptForm({ name: '', body: '' })
      setPromptMessage({ type: 'ok', text: 'Prompt updated.' })
      await loadPrompts()
    } else {
      setPromptMessage({ type: 'err', text: result.error })
    }
  }

  async function handleDeletePrompt(id: string) {
    if (!confirm('Delete this prompt? It cannot be undone.')) return
    setPromptMessage(null)
    setPromptsLoading(true)
    const result = await deleteHeadshotPrompt(id)
    setPromptsLoading(false)
    if (result.ok) {
      setPromptMessage({ type: 'ok', text: 'Prompt deleted.' })
      if (selectedPromptId === id) setSelectedPromptId('default')
      setEditingPromptId(null)
      await loadPrompts()
    } else {
      setPromptMessage({ type: 'err', text: result.error })
    }
  }

  function startEditingPrompt(p: HeadshotPromptOption) {
    if (p.isDefault) return
    setEditingPromptId(p.id)
    setEditingPromptForm({ name: p.name, body: p.body })
  }

  async function handleDuplicateDefault() {
    const defaultOpt = promptOptions.find((o) => o.isDefault)
    if (!defaultOpt) return
    setPromptMessage(null)
    setPromptsLoading(true)
    const result = await createHeadshotPrompt({
      name: `${defaultOpt.name} (copy)`,
      body: defaultOpt.body,
    })
    setPromptsLoading(false)
    if (result.ok) {
      setPromptMessage({ type: 'ok', text: 'Duplicate created. You can edit it below.' })
      await loadPrompts()
      setSelectedPromptId(result.id)
      setEditingPromptId(result.id)
      setEditingPromptForm({ name: `${defaultOpt.name} (copy)`, body: defaultOpt.body })
    } else {
      setPromptMessage({ type: 'err', text: result.error })
    }
  }

  async function handleUploadIntroVideo() {
    setMessage(null)
    const fileInput = introVideoFileRef.current
    const file = fileInput?.files?.[0]
    if (!file) {
      setMessage({ type: 'err', text: 'Please choose a video file (MP4 or WebM).' })
      return
    }
    setIntroVideoUploading(true)
    const formData = new FormData()
    formData.set('file', file)
    const result = await uploadBrokerIntroVideo(broker.id, formData)
    setIntroVideoUploading(false)
    if (result.ok) {
      setForm((f) => ({ ...f, intro_video_url: result.url }))
      setMessage({ type: 'ok', text: 'Intro video uploaded and set as broker hero video.' })
      router.refresh()
      if (fileInput) fileInput.value = ''
    } else {
      setMessage({ type: 'err', text: result.error })
    }
  }

  async function handleGenerateSynthesiaVideo() {
    setMessage(null)
    if (!synthesiaPrompt.trim()) {
      setMessage({ type: 'err', text: 'Please enter a script for the video.' })
      return
    }
    setSynthesiaGenerating(true)
    const result = await generateAndSaveSynthesiaIntroVideo({
      brokerId: broker.id,
      scriptText: synthesiaPrompt,
      avatarId: synthesiaAvatarId,
      title: `Intro - ${broker.display_name}`,
      setAsIntro: synthesiaSetAsIntro,
    })
    setSynthesiaGenerating(false)
    if (result.ok) {
      setForm((f) => ({ ...f, intro_video_url: synthesiaSetAsIntro ? result.url : f.intro_video_url }))
      const list = await listBrokerGeneratedMedia(broker.id)
      setGeneratedMedia(list)
      setMessage({ type: 'ok', text: synthesiaSetAsIntro ? 'Intro video generated and set as hero.' : 'Intro video generated and saved.' })
      router.refresh()
    } else {
      setMessage({ type: 'err', text: result.error })
    }
  }

  async function handleSetGeneratedAsIntro(mediaId: string) {
    setMessage(null)
    const result = await setBrokerIntroVideoFromGenerated(broker.id, mediaId)
    if (result.ok) {
      setForm((f) => ({ ...f, intro_video_url: result.url }))
      setMessage({ type: 'ok', text: 'Set as intro video.' })
      router.refresh()
    } else {
      setMessage({ type: 'err', text: result.error })
    }
  }

  async function handleUpdateGeneratedMediaTitle(mediaId: string, title: string) {
    const result = await updateBrokerGeneratedMedia(mediaId, { title: title || null })
    if (result.ok) {
      setGeneratedMedia((prev) => prev.map((m) => (m.id === mediaId ? { ...m, title } : m)))
      setEditingMediaId(null)
      setEditingMediaTitle('')
      router.refresh()
    }
  }

  async function handleDeleteGeneratedMedia(mediaId: string) {
    if (!confirm('Remove this saved video/photo? It will no longer appear in the list.')) return
    setMessage(null)
    const result = await deleteBrokerGeneratedMedia(mediaId)
    if (result.ok) {
      setGeneratedMedia((prev) => prev.filter((m) => m.id !== mediaId))
      const currentIntro = form.intro_video_url
      const deleted = generatedMedia.find((m) => m.id === mediaId)
      if (deleted && deleted.url === currentIntro) {
        setForm((f) => ({ ...f, intro_video_url: '' }))
      }
      setMessage({ type: 'ok', text: 'Removed.' })
      router.refresh()
    } else {
      setMessage({ type: 'err', text: result.error })
    }
  }

  return (
    <div className={`space-y-6 rounded-lg border border-border bg-white p-6 ${className}`}>
      {message && (
        <p className={`text-sm ${message.type === 'ok' ? 'text-green-500' : 'text-destructive'}`}>
          {message.text}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Display name <span className="text-destructive">*</span></span>
          <input
            type="text"
            required
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Title <span className="text-destructive">*</span></span>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Principal Broker, Broker"
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-muted-foreground">Oregon license number <span className="text-destructive">*</span></span>
        <p className="mt-0.5 text-xs text-muted-foreground">Required for advertising compliance (Oregon Real Estate Agency).</p>
        <input
          type="text"
          required
          value={form.license_number}
          onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
          placeholder="e.g. 201206613"
          className="mt-1 block w-full max-w-xs rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-muted-foreground">Tagline</span>
        <input
          type="text"
          value={form.tagline}
          onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
          placeholder="Short tagline for agent hero"
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-muted-foreground">Bio</span>
        <textarea
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={4}
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Specialties</span>
          <p className="mt-0.5 text-xs text-muted-foreground">Comma-separated, e.g. First-time buyers, Luxury, Land</p>
          <input
            type="text"
            value={form.specialties}
            onChange={(e) => setForm((f) => ({ ...f, specialties: e.target.value }))}
            placeholder="First-time buyers, Luxury, Land"
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Designations</span>
          <p className="mt-0.5 text-xs text-muted-foreground">Comma-separated, e.g. CRS, GRI</p>
          <input
            type="text"
            value={form.designations}
            onChange={(e) => setForm((f) => ({ ...f, designations: e.target.value }))}
            placeholder="CRS, GRI"
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-muted-foreground">Years of experience</span>
        <input
          type="number"
          min={0}
          value={form.years_experience === '' ? '' : form.years_experience}
          onChange={(e) => setForm((f) => ({ ...f, years_experience: e.target.value === '' ? '' : Number(e.target.value) }))}
          placeholder="e.g. 10"
          className="mt-1 block w-24 rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </label>
      <div ref={headshotSectionRef} className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Headshot</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Upload a headshot or generate one with AI. Only the default photo is used on the site; you can save multiple and pick one.
        </p>
        {headshotGenerating && (
          <div className="mt-4 flex items-center gap-4 rounded-lg border-2 border-yellow-500/40 bg-yellow-500/10 p-4" role="status" aria-live="polite">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">Generating professional headshot…</p>
              <p className="text-xs text-yellow-500">This usually takes 1–2 minutes. Please wait — do not leave or refresh.</p>
            </div>
          </div>
        )}
        {form.photo_url && (
          <div className="mt-3 flex items-start gap-4">
            <button
              type="button"
              onClick={() => setHeadshotLightboxUrl(form.photo_url!)}
              className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              title="View full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Broker headshot: dynamic URL (upload/AI); next/image not used for admin form */}
              <img
                src={form.photo_url}
                alt={`${broker.display_name} headshot`}
                className="h-full w-full object-contain"
              />
            </button>
            <div className="min-w-0 flex-1 text-xs text-muted-foreground">
              Current default (shown on team/agent pages). Replace by uploading, generating with AI, or choosing a saved headshot below.
            </div>
          </div>
        )}
        {generatedPreviewUrl && (
          <div ref={generatedPreviewRef} className="mt-4 rounded-lg border-2 border-green-500/40 bg-green-500/10/80 p-4">
            <p className="text-sm font-medium text-green-500">Your new headshot — review and choose an action</p>
            <div className="mt-3 flex flex-wrap items-start gap-4">
              <button
                type="button"
                onClick={() => setHeadshotLightboxUrl(generatedPreviewUrl)}
                className="relative flex h-44 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                title="Click to view full size"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Generated headshot blob URL; next/image not used in admin form */}
                <img
                  src={generatedPreviewUrl}
                  alt="Generated headshot — review before saving or setting as default"
                  className="h-full w-full object-contain"
                />
              </button>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSetGeneratedAsDefault}
                  className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-500/85"
                >
                  Set as default (use on site)
                </button>
                <button
                  type="button"
                  onClick={handleSaveGenerated}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Save for later
                </button>
                <button
                  type="button"
                  onClick={() => { setGeneratedPreviewUrl(null); setMessage(null); }}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Generate another
                </button>
                <button
                  type="button"
                  onClick={() => { setGeneratedPreviewUrl(null); setMessage(null); }}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Disregard (don’t save)
                </button>
              </div>
            </div>
          </div>
        )}
        {savedHeadshots.length > 0 && (
          <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">Saved headshots</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Choose one as default to show on the site.</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {savedHeadshots.map((url) => {
                const isDefault = form.photo_url?.trim() === url.trim()
                return (
                  <li key={url} className="flex items-center gap-2">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Saved headshot from storage; dynamic URL in admin form */}
                      <img src={url} alt="Broker headshot" className="h-full w-full object-cover" />
                      {isDefault && (
                        <span className="absolute bottom-0 left-0 right-0 bg-green-500 px-1 py-0.5 text-center text-[10px] font-medium text-white">
                          Default
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetSavedAsDefault(url)}
                      disabled={isDefault}
                      className="rounded border border-border bg-white px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-60 disabled:cursor-default"
                    >
                      {isDefault ? 'Default' : 'Set as default'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">1. Upload headshot</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Choose an image file and click Upload to set it as the broker photo.</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="sr-only">Headshot image</span>
                <input
                  ref={headshotFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full max-w-xs text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-green-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-green-500/85"
                />
              </label>
              <button
                type="button"
                onClick={handleUploadHeadshot}
                disabled={headshotUploading}
                className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-500/85 disabled:opacity-50"
              >
                {headshotUploading ? 'Uploading…' : 'Upload headshot'}
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">2. Generate professional headshot with AI</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose a prompt, upload a source photo, then generate. The AI will create a headshot matching the prompt (e.g. studio, wardrobe, background). Takes 1–2 minutes. Then set as default, save, or generate another.
            </p>
            {replicateConfigured === false && (
              <p className="mt-2 text-sm text-yellow-500">
                Replicate not configured. Add <code className="rounded bg-yellow-500/15 px-1">REPLICATE_API_TOKEN</code> to <code className="rounded bg-yellow-500/15 px-1">.env.local</code> and restart the dev server (npm run dev).
              </p>
            )}
            {replicateConfigured === true && (
              <p className="mt-1 text-xs text-green-500">Replicate configured.</p>
            )}
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="block">
                  <span className="mr-2 text-sm font-medium text-muted-foreground">Prompt</span>
                  <select
                    value={selectedPromptId}
                    onChange={(e) => setSelectedPromptId(e.target.value)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    aria-describedby="prompt-select-help"
                  >
                    {promptOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.isDefault ? ' (built-in)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setPromptPreviewOpen((o) => !o)}
                  className="text-sm text-muted-foreground underline hover:text-foreground"
                >
                  {promptPreviewOpen ? 'Hide prompt text' : 'View prompt text'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManagePromptsOpen((o) => !o)
                    setPromptMessage(null)
                    if (!managePromptsOpen) loadPrompts()
                  }}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  {managePromptsOpen ? 'Close manage prompts' : 'Manage prompts'}
                </button>
              </div>
              <p id="prompt-select-help" className="text-xs text-muted-foreground">
                The selected prompt is sent to the AI. Use &quot;Manage prompts&quot; to add, edit, or delete custom prompts. Use <code className="rounded bg-border px-1">[GENDER]</code> in custom prompts to insert Male/Female.
              </p>
              {promptPreviewOpen && (() => {
                const current = promptOptions.find((p) => p.id === selectedPromptId)
                return current ? (
                  <pre className="max-h-48 overflow-auto rounded border border-border bg-muted p-3 text-xs text-foreground whitespace-pre-wrap font-sans">
                    {current.body}
                  </pre>
                ) : null
              })()}
            </div>
            {managePromptsOpen && (
              <div className="mt-4 rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-semibold text-foreground">Manage prompts</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add custom prompts or edit saved ones. The default prompt is read-only; duplicate it to create an editable copy.
                </p>
                {promptMessage && (
                  <p className={`mt-2 text-sm ${promptMessage.type === 'ok' ? 'text-green-500' : 'text-destructive'}`}>
                    {promptMessage.text}
                  </p>
                )}
                <ul className="mt-3 space-y-2">
                  {promptOptions.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 rounded border border-border bg-muted/50 px-3 py-2">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.isDefault && <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted-foreground">Built-in</span>}
                      {p.isDefault ? (
                        <button
                          type="button"
                          onClick={handleDuplicateDefault}
                          disabled={promptsLoading}
                          className="text-sm text-green-500 hover:underline disabled:opacity-50"
                        >
                          Duplicate to edit
                        </button>
                      ) : editingPromptId === p.id ? (
                        <>
                          <button type="button" onClick={handleUpdatePrompt} disabled={promptsLoading} className="text-sm text-green-500 hover:underline disabled:opacity-50">Save</button>
                          <button type="button" onClick={() => { setEditingPromptId(null); setEditingPromptForm({ name: '', body: '' }); }} className="text-sm text-muted-foreground hover:underline">Cancel</button>
                          <button type="button" onClick={() => handleDeletePrompt(p.id)} disabled={promptsLoading} className="text-sm text-destructive hover:underline disabled:opacity-50">Delete</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEditingPrompt(p)} className="text-sm text-green-500 hover:underline">Edit</button>
                          <button type="button" onClick={() => handleDeletePrompt(p.id)} disabled={promptsLoading} className="text-sm text-destructive hover:underline disabled:opacity-50">Delete</button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {editingPromptId && (
                  <div className="mt-4 rounded border border-green-500/30 bg-green-500/10/50 p-4">
                    <p className="text-sm font-medium text-foreground">Edit prompt</p>
                    <label className="mt-2 block">
                      <span className="text-xs text-muted-foreground">Name</span>
                      <input
                        type="text"
                        value={editingPromptForm.name}
                        onChange={(e) => setEditingPromptForm((f) => ({ ...f, name: e.target.value }))}
                        className="mt-0.5 block w-full max-w-md rounded border border-border px-2 py-1.5 text-sm"
                        placeholder="e.g. Outdoor casual"
                      />
                    </label>
                    <label className="mt-2 block">
                      <span className="text-xs text-muted-foreground">Prompt text (use [GENDER] for Male/Female)</span>
                      <textarea
                        value={editingPromptForm.body}
                        onChange={(e) => setEditingPromptForm((f) => ({ ...f, body: e.target.value }))}
                        rows={8}
                        className="mt-0.5 block w-full rounded border border-border px-2 py-1.5 text-sm font-mono"
                        placeholder="Professional headshot..."
                      />
                    </label>
                  </div>
                )}
                <div className="mt-4 rounded border border-border bg-muted/50 p-4">
                  <p className="text-sm font-medium text-foreground">Add new prompt</p>
                  <label className="mt-2 block">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <input
                      type="text"
                      value={newPromptForm.name}
                      onChange={(e) => setNewPromptForm((f) => ({ ...f, name: e.target.value }))}
                      className="mt-0.5 block w-full max-w-md rounded border border-border px-2 py-1.5 text-sm"
                      placeholder="e.g. Outdoor casual"
                    />
                  </label>
                  <label className="mt-2 block">
                    <span className="text-xs text-muted-foreground">Prompt text (use [GENDER] for Male/Female)</span>
                    <textarea
                      value={newPromptForm.body}
                      onChange={(e) => setNewPromptForm((f) => ({ ...f, body: e.target.value }))}
                      rows={8}
                      className="mt-0.5 block w-full rounded border border-border px-2 py-1.5 text-sm font-mono"
                      placeholder="Professional headshot, [GENDER] subject..."
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleCreatePrompt}
                    disabled={promptsLoading}
                    className="mt-3 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500/85 disabled:opacity-50"
                  >
                    {promptsLoading ? 'Saving…' : 'Save prompt'}
                  </button>
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="sr-only">Source photo</span>
                <input
                  ref={aiSourceFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full max-w-xs text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-green-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-green-500/85"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Subject:</span>
                <select
                  ref={headshotGenderRef}
                  defaultValue="Male"
                  className="rounded-lg border border-border px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleGenerateHeadshot}
                disabled={headshotGenerating}
                className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-500/85 disabled:opacity-50"
              >
                {headshotGenerating ? 'Generating…' : 'Generate professional headshot'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Intro video (hero / header)</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Optional video shown as the header/hero on the broker&apos;s agent and team page. If none is set, the page is built without a video hero.
        </p>
        {form.intro_video_url && (
          <p className="mt-2 text-xs text-muted-foreground">
            Current: <span className="truncate font-mono">{form.intro_video_url}</span>
          </p>
        )}
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">Upload intro video</p>
            <p className="mt-0.5 text-xs text-muted-foreground">MP4 or WebM. Stored in broker storage and set as hero video.</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="sr-only">Intro video file</span>
                <input
                  ref={introVideoFileRef}
                  type="file"
                  accept="video/mp4,video/webm"
                  className="block w-full max-w-xs text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-green-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-green-500/85"
                />
              </label>
              <button
                type="button"
                onClick={handleUploadIntroVideo}
                disabled={introVideoUploading}
                className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-500/85 disabled:opacity-50"
              >
                {introVideoUploading ? 'Uploading…' : 'Upload intro video'}
              </button>
            </div>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Intro video URL</span>
            <p className="mt-0.5 text-xs text-muted-foreground">Or paste a URL (e.g. from Vimeo, YouTube embed, or direct MP4/WebM). Save changes below to apply.</p>
            <input
              type="url"
              value={form.intro_video_url}
              onChange={(e) => setForm((f) => ({ ...f, intro_video_url: e.target.value }))}
              placeholder="https://..."
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        </div>

        {synthesiaConfigured === true && (
          <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
            <h4 className="text-sm font-semibold text-foreground">Generate intro video (Synthesia)</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Create an AI avatar video with a default prompt. Use <code className="rounded bg-border px-0.5">[Broker Name]</code> in the script and it will be replaced with this broker&apos;s name.
            </p>
            <label className="mt-3 block">
              <span className="text-xs font-medium text-muted-foreground">Script</span>
              <textarea
                value={synthesiaPrompt}
                onChange={(e) => setSynthesiaPrompt(e.target.value)}
                rows={4}
                placeholder={DEFAULT_INTRO_PROMPT}
                className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-medium text-muted-foreground">Avatar</span>
              <select
                value={synthesiaAvatarId}
                onChange={(e) => setSynthesiaAvatarId(e.target.value)}
                className="mt-1 block w-full max-w-xs rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {SYNTHESIA_AVATAR_OPTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={synthesiaSetAsIntro}
                  onChange={(e) => setSynthesiaSetAsIntro(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-green-500 focus:ring-accent"
                />
                <span className="text-sm text-muted-foreground">Set as intro video when done</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateSynthesiaVideo}
                disabled={synthesiaGenerating}
                className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-500/85 disabled:opacity-50"
              >
                {synthesiaGenerating ? 'Generating… (this may take a few minutes)' : 'Generate video'}
              </button>
            </div>
          </div>
        )}
        {synthesiaConfigured === false && (
          <p className="mt-2 text-xs text-muted-foreground">Add SYNTHESIA_API_KEY to enable AI intro video generation.</p>
        )}

        {generatedMedia.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-foreground">Saved videos &amp; photos</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Generated or uploaded media. Edit title, delete, or set a video as the intro.</p>
            <ul className="mt-3 space-y-3">
              {generatedMedia.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white p-3">
                  {m.type === 'video' ? (
                    <video src={m.url} className="h-20 w-32 rounded object-cover" muted playsInline />
                  ) : (
                    <img src={m.url} alt="Broker media" className="h-20 w-32 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    {editingMediaId === m.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editingMediaTitle}
                          onChange={(e) => setEditingMediaTitle(e.target.value)}
                          placeholder="Title"
                          className="rounded border border-border px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateGeneratedMediaTitle(m.id, editingMediaTitle)}
                          className="text-sm text-green-500 hover:underline"
                        >
                          Save
                        </button>
                        <button type="button" onClick={() => { setEditingMediaId(null); setEditingMediaTitle('') }} className="text-sm text-muted-foreground hover:underline">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{m.title || (m.type === 'video' ? 'Video' : 'Photo')}</p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">{m.source === 'synthesia' ? 'Synthesia' : 'Upload'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingMediaId !== m.id && (
                      <button
                        type="button"
                        onClick={() => { setEditingMediaId(m.id); setEditingMediaTitle(m.title || '') }}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        Edit title
                      </button>
                    )}
                    {m.type === 'video' && form.intro_video_url !== m.url && (
                      <button
                        type="button"
                        onClick={() => handleSetGeneratedAsIntro(m.id)}
                        className="text-sm text-green-500 hover:underline"
                      >
                        Set as intro
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteGeneratedMedia(m.id)}
                      className="text-sm text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Photo URL</span>
          <p className="mt-0.5 text-xs text-muted-foreground">Or paste a URL to use an external image.</p>
          <input
            type="url"
            value={form.photo_url}
            onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
            placeholder="https://..."
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-muted-foreground">Phone</span>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="mt-1 block w-full max-w-xs rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </label>
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Review links</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Add your Google and Zillow review page URLs so they appear on your public profile.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Google reviews URL</span>
            <input
              type="url"
              value={form.google_review_url}
              onChange={(e) => setForm((f) => ({ ...f, google_review_url: e.target.value }))}
              placeholder="https://g.page/... or Google Business profile link"
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Zillow reviews URL</span>
            <input
              type="url"
              value={form.zillow_review_url}
              onChange={(e) => setForm((f) => ({ ...f, zillow_review_url: e.target.value }))}
              placeholder="https://www.zillow.com/..."
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Social links</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Profile URLs for Instagram, Facebook, LinkedIn, YouTube, TikTok. Shown on public agent page when set.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Instagram</span>
            <input
              type="url"
              value={form.social_instagram}
              onChange={(e) => setForm((f) => ({ ...f, social_instagram: e.target.value }))}
              placeholder="https://instagram.com/..."
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Facebook</span>
            <input
              type="url"
              value={form.social_facebook}
              onChange={(e) => setForm((f) => ({ ...f, social_facebook: e.target.value }))}
              placeholder="https://facebook.com/..."
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">LinkedIn</span>
            <input
              type="url"
              value={form.social_linkedin}
              onChange={(e) => setForm((f) => ({ ...f, social_linkedin: e.target.value }))}
              placeholder="https://linkedin.com/in/..."
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">YouTube</span>
            <input
              type="url"
              value={form.social_youtube}
              onChange={(e) => setForm((f) => ({ ...f, social_youtube: e.target.value }))}
              placeholder="https://youtube.com/..."
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">TikTok</span>
            <input
              type="url"
              value={form.social_tiktok}
              onChange={(e) => setForm((f) => ({ ...f, social_tiktok: e.target.value }))}
              placeholder="https://tiktok.com/@..."
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6 border-t border-border pt-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="h-4 w-4 rounded border-border text-green-500 focus:ring-accent"
          />
          <span className="text-sm font-medium text-muted-foreground">Active (visible on team page)</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Sort order</span>
          <input
            type="number"
            min={0}
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
            className="w-20 rounded-lg border border-border px-2 py-1.5 text-foreground"
          />
        </label>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={loading}
          className="rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500/85 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <a
          href={`/agents/${broker.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          View agent page
        </a>
        <a
          href={`/team/${broker.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          View team page
        </a>
        <button
          type="button"
          onClick={handleRemove}
          disabled={loading}
          className="rounded-lg border border-destructive/30 bg-white px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          Remove broker
        </button>
      </div>

      {/* Full-size headshot lightbox */}
      {headshotLightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Headshot full size"
          onClick={() => setHeadshotLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setHeadshotLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-foreground shadow hover:bg-white"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
          </button>
          <div
            className="max-h-[90vh] max-w-[90vw] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Lightbox: dynamic headshot URL in admin form */}
            <img
              src={headshotLightboxUrl}
              alt="Headshot full size"
              className="max-h-[85vh] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
