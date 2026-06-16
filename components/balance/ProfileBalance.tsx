"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Trash2, Download } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ENTRY_TYPE_LABELS } from "@/types"
import type { BalanceEntry, Bookmaker, EntryType } from "@/types"

const schema = z.object({
  entry_type: z.enum(["deposit", "withdrawal", "profit", "loss", "bonus", "adjustment"]),
  amount: z.string().min(1).refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Valor inválido"),
  bookmaker_id: z.string().optional(),
  entry_date: z.string().min(1, "Data obrigatória"),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function getEntryColor(type: EntryType) {
  if (["deposit", "profit", "bonus"].includes(type)) return "text-[var(--color-green)]"
  if (["withdrawal", "loss"].includes(type)) return "text-[var(--color-red)]"
  return "text-[var(--color-muted)]"
}

function getEntrySign(type: EntryType, amount: number) {
  if (["deposit", "profit", "bonus"].includes(type)) return `+${formatCurrency(amount)}`
  if (["withdrawal", "loss"].includes(type)) return `-${formatCurrency(amount)}`
  return formatCurrency(amount)
}

export default function ProfileBalance({ profileId }: { profileId: string }) {
  const [entries, setEntries] = useState<BalanceEntry[]>([])
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")
  const [page, setPage] = useState(0)
  const PER_PAGE = 20
  const supabase = createClient()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      entry_type: "deposit",
      entry_date: new Date().toISOString().split("T")[0],
    },
  })

  const entryType = watch("entry_type")

  async function load() {
    const [{ data: e }, { data: b }] = await Promise.all([
      supabase.from("balance_entries").select("*").eq("user_profile_id", profileId).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("bookmakers").select("*").eq("user_profile_id", profileId),
    ])
    setEntries(e || [])
    setBookmakers(b || [])
  }

  useEffect(() => { load() }, [profileId])

  async function onSubmit(data: FormData) {
    const { error } = await supabase.from("balance_entries").insert({
      user_profile_id: profileId,
      entry_type: data.entry_type,
      amount: parseFloat(data.amount),
      bookmaker_id: data.bookmaker_id || null,
      entry_date: data.entry_date,
      description: data.description || null,
    })
    if (error) { toast.error("Erro ao salvar lançamento"); return }
    toast.success("Lançamento salvo!")
    reset({ entry_type: "deposit", entry_date: new Date().toISOString().split("T")[0] })
    setDialogOpen(false)
    load()
  }

  async function deleteEntry(id: string) {
    if (!confirm("Excluir este lançamento?")) return
    await supabase.from("balance_entries").delete().eq("id", id)
    toast.success("Lançamento excluído")
    load()
  }

  // Stats
  const totalDeposit = entries.filter(e => e.entry_type === "deposit").reduce((s, e) => s + e.amount, 0)
  const totalWithdrawal = entries.filter(e => e.entry_type === "withdrawal").reduce((s, e) => s + e.amount, 0)
  const totalProfit = entries.filter(e => e.entry_type === "profit").reduce((s, e) => s + e.amount, 0)
  const totalLoss = entries.filter(e => e.entry_type === "loss").reduce((s, e) => s + e.amount, 0)
  const netProfit = totalProfit - totalLoss
  const roi = totalDeposit > 0 ? (netProfit / totalDeposit) * 100 : 0

  // Chart data
  const chartData = (() => {
    let running = 0
    const sorted = [...entries].reverse()
    return sorted.map(e => {
      if (["deposit", "profit", "bonus"].includes(e.entry_type)) running += e.amount
      else if (["withdrawal", "loss"].includes(e.entry_type)) running -= e.amount
      else running += e.amount
      return { date: formatDate(e.entry_date), balance: running }
    })
  })()

  // Filtered + paginated
  const filtered = filterType === "all" ? entries : entries.filter(e => e.entry_type === filterType)
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  function exportCSV() {
    const rows = [
      ["Data", "Tipo", "Casa", "Valor", "Descrição"],
      ...filtered.map(e => [
        e.entry_date,
        ENTRY_TYPE_LABELS[e.entry_type as EntryType],
        bookmakers.find(b => b.id === e.bookmaker_id)?.name || "",
        e.amount.toString(),
        e.description || "",
      ])
    ]
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "saldo.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Depositado", value: formatCurrency(totalDeposit), color: "text-[var(--color-text)]" },
          { label: "Total Sacado", value: formatCurrency(totalWithdrawal), color: "text-[var(--color-text)]" },
          { label: "Lucro Líquido", value: formatCurrency(netProfit), color: netProfit >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]" },
          { label: "ROI", value: `${roi.toFixed(2)}%`, color: roi >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-[var(--color-muted)]">{s.label}</p>
              <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader><CardTitle>Evolução do Saldo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <Tooltip
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px" }}
                  formatter={(v) => [formatCurrency(Number(v)), "Saldo"]}
                />
                <Line type="monotone" dataKey="balance" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-[var(--color-text)]">Histórico</h3>
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(0) }}
              className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-sm text-[var(--color-text)]"
            >
              <option value="all">Todos</option>
              {Object.entries(ENTRY_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Lançamento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo*</Label>
                    <Select value={entryType} onValueChange={(v) => setValue("entry_type", v as EntryType)}>
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
                    <Input type="number" step="0.01" placeholder="0,00" {...register("amount")} />
                    {errors.amount && <p className="text-xs text-[var(--color-red)]">{errors.amount.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Casa de Aposta</Label>
                    <Select onValueChange={(v) => setValue("bookmaker_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma (opcional)" /></SelectTrigger>
                      <SelectContent>
                        {bookmakers.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data*</Label>
                    <Input type="date" {...register("entry_date")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea placeholder="Observação opcional..." {...register("description")} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Salvando..." : "Salvar Lançamento"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-[var(--color-muted)]">
              Nenhuma movimentação registrada. Adicione um depósito inicial.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    {["Data", "Tipo", "Casa", "Valor", "Descrição", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[var(--color-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(entry => (
                    <tr key={entry.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted)]">{formatDate(entry.entry_date)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={getEntryColor(entry.entry_type as EntryType)}>
                          {ENTRY_TYPE_LABELS[entry.entry_type as EntryType]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted)] text-xs">
                        {bookmakers.find(b => b.id === entry.bookmaker_id)?.name || "—"}
                      </td>
                      <td className={`px-4 py-3 font-mono font-semibold ${getEntryColor(entry.entry_type as EntryType)}`}>
                        {getEntrySign(entry.entry_type as EntryType, entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted)] text-xs truncate max-w-[200px]">
                        {entry.description || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.id)}>
                          <Trash2 className="h-4 w-4 text-[var(--color-muted)] hover:text-[var(--color-red)]" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length > PER_PAGE && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--color-muted)]">
                  {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={(page + 1) * PER_PAGE >= filtered.length} onClick={() => setPage(p => p + 1)}>
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
