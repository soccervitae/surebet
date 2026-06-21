"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, CheckCircle2, AlertCircle, Calendar } from "lucide-react"
import type { User } from "@supabase/supabase-js"

export default function AssinaturaPage() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Assinatura</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">Gerencie sua assinatura do SureBet Manager</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[var(--color-accent)]" />
            Status da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[var(--color-green)]" />
            <div>
              <p className="font-semibold text-[var(--color-text)]">Período de acesso ativo</p>
              <p className="text-sm text-[var(--color-muted)]">Você está com acesso completo ao sistema</p>
            </div>
            <Badge variant="success" className="ml-auto">Ativo</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plano SureBet Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[var(--color-text)]">R$ 49,90</span>
            <span className="text-[var(--color-muted)]">/mês</span>
          </div>

          <ul className="space-y-2 text-sm text-[var(--color-muted)]">
            {[
              "Perfis ilimitados de apostador",
              "Casas de aposta ilimitadas por perfil",
              "Calculadora de surebet com registro automático",
              "Dashboard financeiro completo",
              "Histórico de apostas com gráficos",
              "Export de dados em CSV",
            ].map(item => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-green)] shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
            <p className="text-sm font-medium text-[var(--color-text)]">Formas de pagamento</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">Cartão de Crédito</span>
                <span className="text-xs text-[var(--color-green)]">Recorrência automática</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                <Calendar className="h-5 w-5" />
                <span className="text-xs">PIX</span>
                <span className="text-xs text-[var(--color-muted)]">Pagamento manual mensal</span>
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <AlertCircle className="h-4 w-4 text-[var(--color-yellow)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--color-muted)]">
              A integração com gateway de pagamento (Efí Bank/Gerencianet) está sendo configurada.
              Entre em contato pelo WhatsApp para ativar sua assinatura manualmente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
