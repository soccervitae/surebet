"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Trophy, CheckCircle2, XCircle, Clock, Filter } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import type { UserProfile } from "@/types"

type Aposta = {
  id: string
  profile_id: string
  evento: string
  tipo: string
  investimento_total: number
  lucro_garantido: number
  roi_percentual: number
  status: "pendente" | "finalizada" | "cancelada"
  resultado_real: number | null
  finalizada_at: string | null
  created_at: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pendente") return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
  if (status === "finalizada") return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Finalizada</Badge>
  return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>
}

export default function ApostasPage() {
  const [apostas, setApostas] = useState<Aposta[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterProfile, setFilterProfile] = useState("all")
  const [finalizando, setFinalizando] = useState<Aposta | null>(null)
  const [resultado, setResultado] = useState("")
  const [novoStatus, setNovoStatus] = useState<"finalizada" | "cancelada">("finalizada")
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: ps } = await supabase
      .from("sb_user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at")
    setProfiles(ps || [])

    const profileIds = (ps || []).map((p: UserProfile) => p.id)
    if (profileIds.length === 0) { setLoading(false); return }

    const { data } = await supabase
      .from("sb_apostas")
      .select("*")
      .in("profile_id", profileIds)
      .order("created_at", { ascending: false })

    setApostas(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function finalizar() {
    if (!finalizando) return
    const res = parseFloat(resultado)
    if (isNaN(res)) { toast.error("Informe o resultado real"); return }

    const { error } = await supabase
      .from("sb_apostas")
      .update({
        status: novoStatus,
        resultado_real: novoStatus === "cancelada" ? 0 : res,
        finalizada_at: new Date().toISOString(),
      })
      .eq("id", finalizando.id)

    if (error) { toast.error("Erro ao finalizar aposta"); return }
    toast.success("Aposta atualizada!")
    setFinalizando(null)
    setResultado("")
    load()
  }

  const filtered = apostas.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false
    if (filterProfile !== "all" && a.profile_id !== filterProfile) return false
    return true
  })

  if (loading) return <div className="flex items-center justify-center h-64 text-[var(--color-muted)]">Carregando...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Histórico de Apostas</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">Todas as surebets registradas</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        {profiles.length > 1 && (
          <Select value={filterProfile} onValueChange={setFilterProfile}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos perfis</SelectItem>
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nickname}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="h-16 w-16 text-[var(--color-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-muted)]">Nenhuma aposta encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-muted)]">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-muted)]">Perfil</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-muted)]">Investido</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-muted)]">Lucro prev.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-muted)]">ROI</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-muted)]">Resultado real</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-muted)]">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const profile = profiles.find(p => p.id === a.profile_id)
                return (
                  <tr key={a.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--color-text)] max-w-[200px] truncate">{a.evento}</td>
                    <td className="px-4 py-3 text-[var(--color-muted)] text-xs">{profile?.nickname || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCurrency(a.investimento_total)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-green)]">{formatCurrency(a.lucro_garantido)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-green)]">{a.roi_percentual.toFixed(2)}%</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {a.resultado_real != null
                        ? <span className={a.resultado_real >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}>
                            {formatCurrency(a.resultado_real)}
                          </span>
                        : <span className="text-[var(--color-muted)]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3">
                      {a.status === "pendente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setFinalizando(a); setResultado(a.lucro_garantido.toFixed(2)) }}
                        >
                          Finalizar
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Finalize dialog */}
      <Dialog open={!!finalizando} onOpenChange={(o) => { if (!o) { setFinalizando(null); setResultado("") } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Finalizar aposta</DialogTitle></DialogHeader>
          {finalizando && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-muted)]">{finalizando.evento}</p>
              <div className="space-y-2">
                <Label>Resultado</Label>
                <Select value={novoStatus} onValueChange={(v) => setNovoStatus(v as "finalizada" | "cancelada")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {novoStatus === "finalizada" && (
                <div className="space-y-2">
                  <Label>Lucro/Prejuízo real (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value)}
                    placeholder={formatCurrency(finalizando.lucro_garantido)}
                  />
                  <p className="text-xs text-[var(--color-muted)]">Lucro previsto: {formatCurrency(finalizando.lucro_garantido)}</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={finalizar} className="flex-1">Confirmar</Button>
                <Button variant="outline" onClick={() => setFinalizando(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
