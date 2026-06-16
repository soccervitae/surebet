"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Trophy, Wallet, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import type { UserProfile, ProfileBalance } from "@/types"
import BookmakerList from "@/components/bookmakers/BookmakerList"
import BalancePage from "@/components/balance/ProfileBalance"

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [balance, setBalance] = useState<ProfileBalance | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from("sb_user_profiles").select("*").eq("id", id).single(),
        supabase.from("sb_profile_balances").select("*").eq("user_profile_id", id).single(),
      ])
      setProfile(p)
      setBalance(b)
    }
    load()
  }, [id])

  if (!profile) return <div className="flex items-center justify-center h-64 text-[var(--color-muted)]">Carregando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/profiles">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full" style={{ backgroundColor: profile.color }} />
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{profile.nickname}</h1>
            <p className="text-sm text-[var(--color-muted)]">{profile.first_name} {profile.last_name}</p>
          </div>
        </div>
        <div className="ml-auto">
          <p className="text-xs text-[var(--color-muted)] text-right">Saldo atual</p>
          <p className={`text-xl font-bold font-mono ${(balance?.current_balance || 0) >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
            {formatCurrency(balance?.current_balance || 0)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="bookmakers">
        <TabsList>
          <TabsTrigger value="bookmakers">
            <Trophy className="h-4 w-4 mr-2" /> Casas de Aposta
          </TabsTrigger>
          <TabsTrigger value="balance">
            <Wallet className="h-4 w-4 mr-2" /> Histórico de Saldo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bookmakers">
          <BookmakerList profileId={id} />
        </TabsContent>
        <TabsContent value="balance">
          <BalancePage profileId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
