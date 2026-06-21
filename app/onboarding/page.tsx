"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import ProfileForm from "@/components/profiles/ProfileForm"

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { count } = await supabase
        .from("sb_user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      if (count && count > 0) router.push("/")
    }
    check()
  }, [])

  function handleSuccess() {
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-8 w-8 text-[var(--color-accent)]" />
            <span className="text-2xl font-bold text-[var(--color-text)]">SureBet Manager</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--color-muted)]">
            <UserPlus className="h-4 w-4" />
            <p className="text-sm">Configure seu primeiro perfil para começar</p>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Criar primeiro perfil</h2>
          <ProfileForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}
