"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Download, Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ENTRY_TYPE_LABELS } from "@/types"
import type { BalanceEntry, Bookmaker, UserProfile, EntryType } from "@/types"

export default function FinanceiroPage() {
  const [entries, setEntries] = useState<BalanceEntry[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [allBookmakers, setAllBookmakers] = useState<Bookmaker[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterProfile, setFilterProfile] = useState("all")
  const [filterType, setFilterType] = useState("all")

  // form state
  const [fProfile, setFProfile] = useState("")
  const [fType, setFType] = useState<EntryType>("deposit")
  const [fAmount, setFAmount] = useState("")
  const [fBookmaker, setFBookmaker] = useState("")
  const [fDate, setFDate] = useState(new Date().toISOString().split("T")[0])
  const [fDesc, setFDesc] = useState("")
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: ps } = await supabase.from("sb_user_profiles").select("*").eq("user_id", user.id).order("created_at")
    const profileList = ps || []
    setProfiles(profileList)

    const profileIds = profileList.map((p: UserProfile) => p.id)
    if (profileIds.length === 0) { setLoading(false); return }

    const [{ data: ents }, { data: bms }] = await Promise.all([
      supabase.from("sb_balance_entries").select("*").in("user_profile_id", profileIds).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("sb_bookmakers").select("*").in("user_profile_id", profileIds),
    ])

    setEntries(ents || [])
    setAllBookmakers(bms || [])
    if (profileList.length === 1) setFProfile(profileList[0].id)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const bookmakers = fProfile ? allBookmakers.filter(b => b.user_profile_id === fProfile) : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(fAmount)
    if (!fProfile) { toast.error("Selecione o perfil"); return }
    if (isNaN(amt) || amt <= 0) { toast.error("Valor inválido"); return }

    setSaving(true)
    const { error } = await supabase.from("sb_balance_entries").insert({
      user_profile_id: fProfile,
      entry_type: fType,
      amount: amt,
      bookmaker_id: fBookmaker || null,
      entry_date: fDate,
      description: fDesc || null,
    })

    if (error) { toast.error("Erro ao salvar lançamento"); setSaving(false); return }
    toast.success("Lançamento registrado!")
    setDialogOpen(false)
    setFAmount(""); setFDesc(""); setFBookmaker("")
    setSaving(false)
    load()
  }

  const filtered = entries.filter(e => {
    if (filterProfile !== "all" && e.user_profile_id !== filterProfile) return false
    if (filterType !== "all" && e.entry_type !== filterType) return false
    return true
  })

  function getColor(type: EntryType) {
    if (["deposit", "profit", "bonus"].includes(type)) return "text-[var(--color-green)]"
    if (["withdrawal", "loss"].includes(type)) return "text-[var(--color-red)]"
    return "text-[var(--color-muted)]"
  }

  function getSign(type: EntryType, amount: number) {
    if (["deposit", "profit", "bonus"].includes(type)) return `+${formatCurrency(amount)}`
    if (["withdrawal", "loss"].includes(type)) return `-${formatCurrency(amount)}`
    return formatCurrency(amount)
  }

  function exportCSV() {
    const rows = [
      ["Data", "Tipo", "Perfil", "Casa", "Valor", "Descrição"],
      ...filtered.map(e => [
        e.entry_date,
        ENTRY_TYPE_LABELS[e.entry_type as EntryType],
        profiles.find(p => p.id === e.user_profile_id)?.nickname || "",
        allBookmakers.find(b => b.id === e.bookmaker_id)?.name || "",
        e.amount.toString(),
        e.description || "",
      ])
    ]
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "financeiro.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[var(--color-muted)]">Carregando...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Financeiro</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">Histórico de movimentações de todos os perfis</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3 flex-wrap">
          {profiles.length > 1 && (
            <Select value={filterProfile} onValueChange={setFilterProfile}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos perfis</SelectItem>
                {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.nickname}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {Object.entries(ENTRY_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Novo Lançamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {profiles.length > 1 && (
                <div className="space-y-2">
                  <Label>Perfil*</Label>
                  <Select value={fProfile} onValueChange={(v) => { setFProfile(v); setFBookmaker("") }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.nickname}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Tipo*</Label>
                <Select value={fType} onValueChange={(v) => setFType(v as EntryType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTRY_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)*</Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={fAmount} onChange={(e) => setFAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Casa de aposta</Label>
                <Select value={fBookmaker} onValueChange={setFBookmaker}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {bookmakers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data*</Label>
                <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea placeholder="Observação opcional..." value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Salvando..." : "Salvar Lançamento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Wallet className="h-16 w-16 text-[var(--color-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-muted)]">Nenhuma movimentação encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                {["Data", "Tipo", "Perfil", "Casa", "Valor", "Descrição"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[var(--color-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const profile = profiles.find(p => p.id === e.user_profile_id)
                const bm = allBookmakers.find(b => b.id === e.bookmaker_id)
                return (
                  <tr key={e.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted)]">{formatDate(e.entry_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={getColor(e.entry_type as EntryType)}>
                        {ENTRY_TYPE_LABELS[e.entry_type as EntryType]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{profile?.nickname || "—"}</td>
                    <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{bm?.name || "—"}</td>
                    <td className={`px-4 py-3 font-mono font-semibold text-sm ${getColor(e.entry_type as EntryType)}`}>
                      {getSign(e.entry_type as EntryType, e.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-muted)] truncate max-w-[200px]">{e.description || "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
