"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PROFILE_COLORS } from "@/types"
import type { UserProfile } from "@/types"

const schema = z.object({
  first_name: z.string().min(1, "Nome obrigatório"),
  last_name: z.string().min(1, "Sobrenome obrigatório"),
  nickname: z.string().min(1, "Apelido obrigatório"),
  cpf: z.string().min(11, "CPF inválido").max(14),
  color: z.string().min(1),
})

type FormData = z.infer<typeof schema>

export default function ProfileForm({
  profile,
  onSuccess,
}: {
  profile?: UserProfile | null
  onSuccess: () => void
}) {
  const supabase = createClient()

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      nickname: profile?.nickname || "",
      cpf: profile?.cpf || "",
      color: profile?.color || PROFILE_COLORS[0],
    },
  })

  const selectedColor = watch("color")

  async function onSubmit(data: FormData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (!profile) {
      // Check CPF uniqueness
      const { data: existing } = await supabase
        .from("sb_user_profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("cpf", data.cpf)
        .single()

      if (existing) {
        toast.error("Já existe um perfil com esse CPF.")
        return
      }

      const { error } = await supabase.from("sb_user_profiles").insert({
        ...data,
        user_id: user.id,
      })
      if (error) { toast.error("Erro ao criar perfil"); return }
      toast.success("Perfil criado!")
    } else {
      const { error } = await supabase
        .from("sb_user_profiles")
        .update(data)
        .eq("id", profile.id)
      if (error) { toast.error("Erro ao atualizar perfil"); return }
      toast.success("Perfil atualizado!")
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome*</Label>
          <Input placeholder="João" {...register("first_name")} />
          {errors.first_name && <p className="text-xs text-[var(--color-red)]">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Sobrenome*</Label>
          <Input placeholder="Silva" {...register("last_name")} />
          {errors.last_name && <p className="text-xs text-[var(--color-red)]">{errors.last_name.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Apelido*</Label>
        <Input placeholder="joao_principal" {...register("nickname")} />
        {errors.nickname && <p className="text-xs text-[var(--color-red)]">{errors.nickname.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>CPF*</Label>
        <Input placeholder="000.000.000-00" {...register("cpf")} />
        {errors.cpf && <p className="text-xs text-[var(--color-red)]">{errors.cpf.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Cor de identificação</Label>
        <div className="flex flex-wrap gap-2">
          {PROFILE_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setValue("color", color)}
              className="h-8 w-8 rounded-full border-2 transition-all"
              style={{
                backgroundColor: color,
                borderColor: selectedColor === color ? "white" : "transparent",
                transform: selectedColor === color ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : profile ? "Salvar Alterações" : "Criar Perfil"}
      </Button>
    </form>
  )
}
