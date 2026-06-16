"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { POPULAR_BOOKMAKERS } from "@/types"
import type { Bookmaker } from "@/types"

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
})

type FormData = z.infer<typeof schema>

export default function BookmakerForm({
  profileId,
  bookmaker,
  onSuccess,
}: {
  profileId: string
  bookmaker?: Bookmaker | null
  onSuccess: () => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([])
  const supabase = createClient()

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: bookmaker?.name || "",
      email: bookmaker?.email || "",
      password: bookmaker?.password || "",
    },
  })

  const nameValue = watch("name")

  function handleNameChange(value: string) {
    setValue("name", value)
    if (value.length > 0) {
      setNameSuggestions(
        POPULAR_BOOKMAKERS.filter(b => b.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
      )
    } else {
      setNameSuggestions([])
    }
  }

  async function onSubmit(data: FormData) {
    if (!bookmaker) {
      const { error } = await supabase.from("sb_bookmakers").insert({
        ...data,
        user_profile_id: profileId,
      })
      if (error) { toast.error("Erro ao criar casa de aposta"); return }
      toast.success("Casa de aposta criada!")
    } else {
      const { error } = await supabase
        .from("sb_bookmakers")
        .update(data)
        .eq("id", bookmaker.id)
      if (error) { toast.error("Erro ao atualizar"); return }
      toast.success("Casa de aposta atualizada!")
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2 relative">
        <Label>Nome da casa*</Label>
        <Input
          placeholder="Ex: Bet365, Betano..."
          value={nameValue}
          onChange={(e) => handleNameChange(e.target.value)}
        />
        {nameSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden shadow-lg">
            {nameSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { setValue("name", s); setNameSuggestions([]) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-2)] text-[var(--color-text)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {errors.name && <p className="text-xs text-[var(--color-red)]">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>E-mail de cadastro*</Label>
        <Input type="email" placeholder="email@exemplo.com" {...register("email")} />
        {errors.email && <p className="text-xs text-[var(--color-red)]">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Senha de acesso*</Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-[var(--color-red)]">{errors.password.message}</p>}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
        <ShieldCheck className="h-4 w-4 text-[var(--color-green)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--color-muted)]">
          Suas credenciais são armazenadas de forma privada e protegidas por RLS no Supabase.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : bookmaker ? "Salvar" : "Criar"}
      </Button>
    </form>
  )
}
