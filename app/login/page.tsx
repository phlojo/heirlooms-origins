"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import Link from "next/link"
import { signInWithPassword, signInWithMagicLink, signInWithGoogle } from "@/lib/actions/auth"
import BottomNav from "@/components/navigation/bottom-nav"
import { useIsMobile } from "@/hooks/use-mobile"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isMagicLink, setIsMagicLink] = useState(true)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setError(null)

    try {
      const result = await signInWithGoogle()
      if (result?.error) {
        setError(`Google sign-in failed: ${result.error}. Please try again.`)
        setIsGoogleLoading(false)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred"
      setError(`Google sign-in failed: ${errorMessage}. Please try again.`)
      setIsGoogleLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await signInWithMagicLink(email)
      if (result.error) {
        setError(`Unable to send magic link: ${result.error}. Please check your email address and try again.`)
      } else if (result.success) {
        setSuccess(result.success)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred"
      setError(`Unable to send magic link: ${errorMessage}. Please check your email address and try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await signInWithPassword(email, password)
      if (result?.error) {
        setError(`Sign in failed: ${result.error}. Please verify your credentials and try again.`)
      }
      // If successful, the server action will redirect
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred"
      setError(`Sign in failed: ${errorMessage}. Please verify your credentials and try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6 pb-[var(--bottom-nav-height,80px)]">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Heirlooms</CardTitle>
            <CardDescription>
              {isMagicLink ? "Enter your email to receive a magic link" : "Sign in with your email and password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isMagicLink ? handleMagicLink : handlePasswordLogin}>
              <div className="flex flex-col gap-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                >
                  {isGoogleLoading ? (
                    "Redirecting..."
                  ) : (
                    <>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {!isMagicLink && (
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

                <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                  {isLoading ? "Loading..." : isMagicLink ? "Send Magic Link" : "Sign In"}
                </Button>

                <button
                  type="button"
                  onClick={() => setIsMagicLink(!isMagicLink)}
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  {isMagicLink ? "Use password instead" : "Use magic link instead"}
                </button>

                <div className="text-center">
                  <Link
                    href="/"
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    Back to home
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {isMobile && <BottomNav user={null} />}
    </div>
  )
}
