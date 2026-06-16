"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Percent, Users, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { UserProfile, ProfileBalance, Bookmaker } from "@/types"

type ProfileData = {
  profile: UserProfile
  balance: ProfileBalance | null
  bookmakerCount: number
}

export default function DashboardPage() {
  const [profilesData, setProfilesData] = useState<ProfileData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at")

      if (!profiles) { setLoading(false); return }

      const results: ProfileData[] = await Promise.all(
        profiles.map(async (profile) => {
          const { data: balance } = await supabase
            .from("profile_balances")
            .select("*")
            .eq("user_profile_id", profile.id)
            .single()

          const { count } = await supabase
            .from("bookmakers")
            .select("*", { count: "exact", head: true })
            .eq("user_profile_id", profile.id)
            .eq("is_active", true)

          return { profile, balance: balance || null, bookmakerCount: count || 0 }
        })
      )

      setProfilesData(results)
      setLoading(false)
    }
    load()
  }, [])

  const totalBalance = profilesData.reduce((s, d) => s + (d.balance?.current_balance || 0), 0)

  const chartData = profilesData.map(d => ({
    name: d.profile.nickname,
    balance: d.balance?.current_balance || 0,
    color: d.profile.color,
  }))

  const summaryCards = [
    {
      title: "Saldo Total",
      value: formatCurrency(totalBalance),
      icon: DollarSign,
      positive: totalBalance >= 0,
    },
    {
      title: "Perfis Ativos",
      value: profilesData.length.toString(),
      icon: Users,
      positive: true,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-muted)]">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Dashboard</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">Visão consolidada de todos os perfis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-muted)]">{card.title}</p>
                    <p className={`text-2xl font-bold font-mono mt-1 ${card.positive ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center">
                    <Icon className="h-6 w-6 text-[var(--color-accent)]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saldo por Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <Tooltip
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", color: "var(--color-text)" }}
                  formatter={(v) => [formatCurrency(Number(v)), "Saldo"]}
                />
                <Bar dataKey="balance" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.balance >= 0 ? "var(--color-accent)" : "var(--color-red)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Profile Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Perfis</h2>
          <Link href="/profiles">
            <Button variant="outline" size="sm">
              Gerenciar Perfis
            </Button>
          </Link>
        </div>

        {profilesData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-[var(--color-muted)] mx-auto mb-3" />
              <p className="text-[var(--color-muted)]">Nenhum perfil criado. Crie seu primeiro perfil para começar.</p>
              <Link href="/profiles">
                <Button className="mt-4">Criar Perfil</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profilesData.map(({ profile, balance, bookmakerCount }) => (
              <Card key={profile.id} className="group">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: profile.color }}
                      />
                      <span className="font-bold text-[var(--color-text)]">{profile.nickname}</span>
                    </div>
                    <Badge variant="secondary">{bookmakerCount} bets</Badge>
                  </div>

                  <p className="text-sm text-[var(--color-muted)] mb-1">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] font-mono mb-4">
                    {profile.cpf}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[var(--color-muted)]">Saldo</p>
                      <p className={`text-lg font-bold font-mono ${(balance?.current_balance || 0) >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
                        {formatCurrency(balance?.current_balance || 0)}
                      </p>
                    </div>
                    {balance?.last_activity && (
                      <p className="text-xs text-[var(--color-muted)]">
                        {formatDate(balance.last_activity)}
                      </p>
                    )}
                  </div>

                  <Link href={`/profiles/${profile.id}`} className="block mt-4">
                    <Button variant="outline" size="sm" className="w-full group-hover:border-[var(--color-accent)]">
                      Acessar Perfil <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
