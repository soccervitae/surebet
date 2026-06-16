"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Trophy, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import BookmakerForm from "./BookmakerForm"
import type { Bookmaker } from "@/types"

export default function BookmakerList({ profileId }: { profileId: string }) {
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from("sb_bookmakers")
      .select("*")
      .eq("user_profile_id", profileId)
      .order("created_at")
    setBookmakers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profileId])

  async function toggleActive(bm: Bookmaker) {
    const { error } = await supabase
      .from("sb_bookmakers")
      .update({ is_active: !bm.is_active })
      .eq("id", bm.id)
    if (error) { toast.error("Erro ao atualizar"); return }
    load()
  }

  if (loading) return <div className="py-8 text-center text-[var(--color-muted)]">Carregando...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--color-muted)]">{bookmakers.length} casa(s) cadastrada(s)</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Nova Casa de Aposta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Casa de Aposta</DialogTitle>
            </DialogHeader>
            <BookmakerForm profileId={profileId} onSuccess={() => { setDialogOpen(false); load() }} />
          </DialogContent>
        </Dialog>
      </div>

      {bookmakers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 text-[var(--color-muted)] mx-auto mb-3" />
            <p className="text-[var(--color-muted)]">Nenhuma casa de aposta cadastrada neste perfil.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookmakers.map(bm => (
            <Card key={bm.id} className={!bm.is_active ? "opacity-60" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-[var(--color-accent)]" />
                    <span className="font-semibold text-[var(--color-text)]">{bm.name}</span>
                  </div>
                  <Badge variant={bm.is_active ? "success" : "secondary"}>
                    {bm.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--color-muted)] mb-4">{bm.email}</p>
                <div className="flex gap-2">
                  <Link href={`/profiles/${profileId}/bookmakers/${bm.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Detalhes <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(bm)}>
                    {bm.is_active
                      ? <ToggleRight className="h-5 w-5 text-[var(--color-green)]" />
                      : <ToggleLeft className="h-5 w-5 text-[var(--color-muted)]" />
                    }
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
