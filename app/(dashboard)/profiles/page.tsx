"use client"

import { useEffect, useState } from "react"
import { Plus, Users, Edit2, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import ProfileForm from "@/components/profiles/ProfileForm"
import type { UserProfile } from "@/types"
import Link from "next/link"

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null)
  const supabase = createClient()

  async function loadProfiles() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at")

    setProfiles(data || [])
    setLoading(false)
  }

  useEffect(() => { loadProfiles() }, [])

  async function toggleActive(profile: UserProfile) {
    const { error } = await supabase
      .from("user_profiles")
      .update({ is_active: !profile.is_active })
      .eq("id", profile.id)

    if (error) { toast.error("Erro ao atualizar perfil"); return }
    toast.success(`Perfil ${profile.is_active ? "desativado" : "ativado"}`)
    loadProfiles()
  }

  function openEdit(profile: UserProfile) {
    setEditingProfile(profile)
    setDialogOpen(true)
  }

  function onFormSuccess() {
    setDialogOpen(false)
    setEditingProfile(null)
    loadProfiles()
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[var(--color-muted)]">Carregando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Meus Perfis</h1>
          <p className="text-[var(--color-muted)] text-sm mt-1">Gerencie seus perfis operacionais</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingProfile(null) }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProfile ? "Editar Perfil" : "Novo Perfil"}</DialogTitle>
            </DialogHeader>
            <ProfileForm profile={editingProfile} onSuccess={onFormSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 text-[var(--color-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-text)] font-medium mb-2">Nenhum perfil criado</p>
            <p className="text-[var(--color-muted)] text-sm">Crie seu primeiro perfil para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(profile => (
            <Card key={profile.id} className={!profile.is_active ? "opacity-60" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: profile.color }} />
                    <span className="font-bold text-lg text-[var(--color-text)]">{profile.nickname}</span>
                  </div>
                  <Badge variant={profile.is_active ? "success" : "secondary"}>
                    {profile.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <p className="text-sm text-[var(--color-text)]">{profile.first_name} {profile.last_name}</p>
                <p className="text-xs text-[var(--color-muted)] font-mono mt-1">{profile.cpf}</p>

                <div className="flex gap-2 mt-4">
                  <Link href={`/profiles/${profile.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">Acessar</Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(profile)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(profile)}>
                    {profile.is_active ? (
                      <ToggleRight className="h-5 w-5 text-[var(--color-green)]" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-[var(--color-muted)]" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
