"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Eye, EyeOff, Copy, Edit2, Building2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import BookmakerForm from "@/components/bookmakers/BookmakerForm"
import type { Bookmaker, BankAccount } from "@/types"

export default function BookmakerDetailPage() {
  const { id: profileId, bookId } = useParams<{ id: string; bookId: string }>()
  const [bookmaker, setBookmaker] = useState<Bookmaker | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [depositBank, setDepositBank] = useState("")
  const [withdrawalBank, setWithdrawalBank] = useState("")
  const [sameAsDeposit, setSameAsDeposit] = useState(false)
  const [savingBanks, setSavingBanks] = useState(false)
  const supabase = createClient()

  async function load() {
    const [{ data: bm }, { data: accounts }] = await Promise.all([
      supabase.from("bookmakers").select("*").eq("id", bookId).single(),
      supabase.from("bank_accounts").select("*").eq("bookmaker_id", bookId),
    ])
    setBookmaker(bm)
    setBankAccounts(accounts || [])
    const dep = accounts?.find(a => a.account_type === "deposit")
    const wit = accounts?.find(a => a.account_type === "withdrawal")
    if (dep) setDepositBank(dep.bank_name)
    if (wit) setWithdrawalBank(wit.bank_name)
  }

  useEffect(() => { load() }, [bookId])

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  async function saveBankAccounts() {
    setSavingBanks(true)
    const finalWithdrawal = sameAsDeposit ? depositBank : withdrawalBank

    // Delete existing and re-insert
    await supabase.from("bank_accounts").delete().eq("bookmaker_id", bookId)

    const inserts = []
    if (depositBank) inserts.push({ bookmaker_id: bookId, account_type: "deposit" as const, bank_name: depositBank })
    if (finalWithdrawal) inserts.push({ bookmaker_id: bookId, account_type: "withdrawal" as const, bank_name: finalWithdrawal })

    if (inserts.length > 0) {
      const { error } = await supabase.from("bank_accounts").insert(inserts)
      if (error) { toast.error("Erro ao salvar contas"); setSavingBanks(false); return }
    }

    toast.success("Contas bancárias salvas!")
    setSavingBanks(false)
    load()
  }

  if (!bookmaker) return <div className="flex items-center justify-center h-64 text-[var(--color-muted)]">Carregando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/profiles/${profileId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{bookmaker.name}</h1>
          <Badge variant={bookmaker.is_active ? "success" : "secondary"} className="mt-1">
            {bookmaker.is_active ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Edit2 className="h-4 w-4 mr-2" />Editar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Casa de Aposta</DialogTitle></DialogHeader>
            <BookmakerForm profileId={profileId} bookmaker={bookmaker} onSuccess={() => { setEditOpen(false); load() }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Credentials */}
      <Card>
        <CardHeader><CardTitle>Credenciais de Acesso</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[var(--color-muted)]">E-mail</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm font-mono text-[var(--color-text)]">
                {bookmaker.email}
              </div>
              <Button variant="ghost" size="icon" onClick={() => copy(bookmaker.email, "E-mail")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--color-muted)]">Senha</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm font-mono text-[var(--color-text)]">
                {showPassword ? bookmaker.password : "••••••••"}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => copy(bookmaker.password, "Senha")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      <Card>
        <CardHeader><CardTitle>Contas Bancárias</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--color-accent)]" />
                Conta de Depósito
              </Label>
              <Input
                placeholder="Ex: Nubank, Itaú..."
                value={depositBank}
                onChange={(e) => setDepositBank(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--color-green)]" />
                Conta de Saque
              </Label>
              <Input
                placeholder="Ex: Bradesco, Caixa..."
                value={sameAsDeposit ? depositBank : withdrawalBank}
                onChange={(e) => setWithdrawalBank(e.target.value)}
                disabled={sameAsDeposit}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sameDeposit"
                  checked={sameAsDeposit}
                  onCheckedChange={(v) => setSameAsDeposit(!!v)}
                />
                <label htmlFor="sameDeposit" className="text-xs text-[var(--color-muted)] cursor-pointer">
                  Usar mesmo banco do depósito
                </label>
              </div>
            </div>
          </div>

          <Button onClick={saveBankAccounts} disabled={savingBanks} className="w-full md:w-auto">
            {savingBanks ? "Salvando..." : "Salvar Contas Bancárias"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
