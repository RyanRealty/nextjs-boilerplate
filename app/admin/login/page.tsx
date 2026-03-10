import type { Metadata } from 'next'
import Link from 'next/link'
import AdminLoginForm from '@/components/admin/AdminLoginForm'

export const metadata: Metadata = {
  title: 'Admin sign in',
  description: 'Sign in to the Ryan Realty admin portal.',
  robots: 'noindex, nofollow',
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="text-xl font-bold text-[var(--brand-navy)]">
            Ryan Realty
          </Link>
        </div>
        <h1 className="text-center text-lg font-semibold text-zinc-900">Admin Portal</h1>
        <p className="mt-1 text-center text-sm text-zinc-500">
          Sign in with your admin account
        </p>
        <AdminLoginForm />
      </div>
    </main>
  )
}
