"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

async function getAppOrigin() {
  const headersList = await headers()
  const host = headersList.get("host")
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https"
  return `${protocol}://${host}`
}

export async function signInWithPassword(email: string, password: string, returnTo?: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  redirect(returnTo || "/collections")
}

export async function signInWithMagicLink(email: string, returnTo?: string) {
  const supabase = await createClient()
  const origin = await getAppOrigin()

  const callbackUrl = returnTo
    ? `${origin}/auth/callback?next=${encodeURIComponent(returnTo)}`
    : `${origin}/auth/callback`

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || callbackUrl,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: "Check your email for the magic link!" }
}
