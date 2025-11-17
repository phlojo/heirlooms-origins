"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateUserPassword, setUserPassword } from "@/lib/actions/profile"
import { useRouter } from 'next/navigation'

interface PasswordFormProps {
  mode: "change" | "set"
}

export function PasswordForm({ mode }: PasswordFormProps) {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validate passwords
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const result = mode === "change" 
        ? await updateUserPassword(newPassword)
        : await setUserPassword(newPassword)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(mode === "change" 
          ? "Password updated successfully!" 
          : "Password set successfully! You can now log in with your email and password.")
        setNewPassword("")
        setConfirmPassword("")
        
        // Refresh the page after a short delay
        setTimeout(() => {
          router.refresh()
        }, 2000)
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password (min. 8 characters)"
          required
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          minLength={8}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Saving..." : mode === "change" ? "Change Password" : "Set Password"}
      </Button>

      <p className="text-xs text-muted-foreground">
        {mode === "change" 
          ? "You'll stay logged in after changing your password."
          : "After setting a password, you'll be able to log in with either email/password or magic link."}
      </p>
    </form>
  )
}
