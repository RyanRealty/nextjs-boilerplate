'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailPassword } from '@/app/actions/auth'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'

export default function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter email and password')
      return
    }
    setLoading(true)
    const result = await signInWithEmailPassword(email.trim(), password, { next: '/admin' })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const role = await getAdminRoleForEmail(email.trim())
    if (!role) {
      router.replace('/admin/access-denied')
      return
    }
    router.refresh()
    router.push('/admin')
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="admin-email" className="block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="block text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[var(--brand-navy)] py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
