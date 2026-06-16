"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"
import type { Profile } from "@/types"

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setProfile(data)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Configurações</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">Informações da sua conta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[var(--color-accent)]" />
            Perfil da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile ? (
            <>
              <div>
                <p className="text-xs text-[var(--color-muted)]">Nome</p>
                <p className="text-[var(--color-text)] font-medium">{profile.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted)]">E-mail</p>
                <p className="text-[var(--color-text)]">{profile.email}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted)]">Membro desde</p>
                <p className="text-[var(--color-text)]">{new Date(profile.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </>
          ) : (
            <p className="text-[var(--color-muted)]">Carregando...</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
