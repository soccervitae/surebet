"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Calculator, Save, RefreshCw, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import type { UserProfile, Bookmaker } from "@/types"

type Leg = {
  bookmaker_id: string
  resultado_apostado: string
  odd: string
}

const defaultLeg = (): Leg => ({ bookmaker_id: "", resultado_apostado: "", odd: "" })

export default function CalculadoraPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [profileId, setProfileId] = useState("")
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([])
  const [tipo, setTipo] = useState<"2-way" | "3-way">("2-way")
  const [investimento, setInvestimento] = useState("100")
  const [evento, setEvento] = useState("")
  const [legs, setLegs] = useState<Leg[]>([defaultLeg(), defaultLeg()])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("sb_user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at")
      const ps = data || []
      setProfiles(ps)
      if (ps.length === 1) setProfileId(ps[0].id)
    }
    load()
  }, [])

  useEffect(() => {
    if (!profileId) { setBookmakers([]); return }
    supabase
      .from("sb_bookmakers")
      .select("*")
      .eq("user_profile_id", profileId)
      .eq("is_active", true)
      .then(({ data }) => setBookmakers(data || []))
  }, [profileId])

  useEffect(() => {
    const count = tipo === "2-way" ? 2 : 3
    setLegs(prev => {
      if (prev.length === count) return prev
      if (prev.length < count) return [...prev, defaultLeg()]
      return prev.slice(0, count)
    })
  }, [tipo])

  function updateLeg(i: number, field: keyof Leg, value: string) {
    setLegs(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  const inv = parseFloat(investimento) || 0
  const odds = legs.map(l => parseFloat(l.odd) || 0)
  const validOdds = odds.every(o => o > 1)
  const sumProb = validOdds ? odds.reduce((s, o) => s + 1 / o, 0) : 0
  const isArbitrage = validOdds && sumProb < 1
  const lucroGarantido = isArbitrage ? inv * (1 / sumProb - 1) : 0
  const roi = isArbitrage ? (1 / sumProb - 1) * 100 : 0
  const stakes = isArbitrage ? odds.map(o => inv / (o * sumProb)) : odds.map(() => 0)

  async function handleSave() {
    if (!profileId) { toast.error("Selecione um perfil"); return }
    if (!evento.trim()) { toast.error("Informe o evento"); return }
    if (!isArbitrage) { toast.error("Não é uma arbitragem válida"); return }
    if (legs.some(l => !l.bookmaker_id)) { toast.error("Selecione a casa de aposta em cada perna"); return }
    if (legs.some(l => !l.resultado_apostado.trim())) { toast.error("Informe o resultado apostado em cada perna"); return }

    setSaving(true)
    const { data: aposta, error } = await supabase
      .from("sb_apostas")
      .insert({
        profile_id: profileId,
        evento: evento.trim(),
        tipo,
        investimento_total: inv,
        lucro_garantido: lucroGarantido,
        roi_percentual: roi,
      })
      .select()
      .single()

    if (error || !aposta) {
      toast.error("Erro ao salvar aposta")
      setSaving(false)
      return
    }

    const legsData = legs.map((l, i) => ({
      aposta_id: aposta.id,
      bookmaker_id: l.bookmaker_id,
      resultado_apostado: l.resultado_apostado,
      odd: parseFloat(l.odd),
      stake: stakes[i],
    }))

    const { error: legsError } = await supabase.from("sb_aposta_legs").insert(legsData)
    if (legsError) {
      toast.error("Erro ao salvar pernas da aposta")
      await supabase.from("sb_apostas").delete().eq("id", aposta.id)
      setSaving(false)
      return
    }

    toast.success("Surebet registrada com sucesso!")
    setEvento("")
    setLegs(legs.map(() => defaultLeg()))
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Calculadora de Surebet</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">Calcule apostas de arbitragem e registre automaticamente</p>
      </div>

      {/* Profile selector */}
      {profiles.length > 1 && (
        <div className="space-y-2">
          <Label>Perfil</Label>
          <Select value={profileId} onValueChange={setProfileId}>
            <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
            <SelectContent>
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nickname} — {p.first_name} {p.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de arbitragem</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as "2-way" | "3-way")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2-way">2 resultados (2-way)</SelectItem>
              <SelectItem value="3-way">3 resultados (3-way)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Investimento total (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={investimento}
            onChange={(e) => setInvestimento(e.target.value)}
            placeholder="100,00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Evento*</Label>
        <Input
          placeholder="Ex: Flamengo vs Palmeiras — Brasileirão"
          value={evento}
          onChange={(e) => setEvento(e.target.value)}
        />
      </div>

      {/* Legs */}
      <div className="space-y-4">
        {legs.map((leg, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[var(--color-muted)]">Perna {i + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Casa de aposta*</Label>
                  <Select value={leg.bookmaker_id} onValueChange={(v) => updateLeg(i, "bookmaker_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {bookmakers.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Resultado apostado*</Label>
                  <Input
                    placeholder="Ex: Vitória Flamengo"
                    value={leg.resultado_apostado}
                    onChange={(e) => updateLeg(i, "resultado_apostado", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Odd*</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1.01"
                    placeholder="2.50"
                    value={leg.odd}
                    onChange={(e) => updateLeg(i, "odd", e.target.value)}
                  />
                </div>
              </div>

              {parseFloat(leg.odd) > 1 && (
                <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
                  <span>Probabilidade implícita: <strong className="text-[var(--color-text)]">{(100 / parseFloat(leg.odd)).toFixed(2)}%</strong></span>
                  {stakes[i] > 0 && (
                    <span>Stake: <strong className="text-[var(--color-accent)] font-mono">{formatCurrency(stakes[i])}</strong></span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Result */}
      {validOdds && (
        <Card className={isArbitrage ? "border-[var(--color-green)]" : "border-[var(--color-red)]"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              {isArbitrage
                ? <CheckCircle2 className="h-5 w-5 text-[var(--color-green)]" />
                : <AlertCircle className="h-5 w-5 text-[var(--color-red)]" />
              }
              <span className={`font-semibold ${isArbitrage ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
                {isArbitrage ? "Arbitragem válida!" : "Sem arbitragem — soma das probabilidades ≥ 100%"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[var(--color-muted)]">Soma probabilidades</p>
                <p className={`text-lg font-bold font-mono ${isArbitrage ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
                  {(sumProb * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted)]">Lucro garantido</p>
                <p className="text-lg font-bold font-mono text-[var(--color-green)]">
                  {formatCurrency(lucroGarantido)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted)]">ROI</p>
                <p className="text-lg font-bold font-mono text-[var(--color-green)]">
                  {roi.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleSave}
        disabled={!isArbitrage || saving || !profileId}
        className="w-full md:w-auto"
      >
        {saving ? "Salvando..." : <><Save className="h-4 w-4" /> Registrar Surebet</>}
      </Button>
    </div>
  )
}
