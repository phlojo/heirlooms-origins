import { AppLayout } from "@/components/app-layout"
import { getCurrentUser, createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { redirect } from "next/navigation"
import { Package, ImageIcon, Calendar, Mail, User, Settings } from "lucide-react"
import { ThemePreferenceToggle } from "@/components/theme-preference-toggle"
import { LogoutButton } from "@/components/logout-button"

async function getUserProfile(userId: string) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error) {
    console.error("[v0] Error fetching profile:", error.message)
    return null
  }

  return profile
}

async function getUserStats(userId: string) {
  const supabase = await createClient()

  const [collectionsResult, artifactsResult] = await Promise.all([
    supabase.from("collections").select("id", { count: "exact" }).eq("user_id", userId),
    supabase.from("artifacts").select("id", { count: "exact" }).eq("user_id", userId),
  ])

  return {
    collectionsCount: collectionsResult.count || 0,
    artifactsCount: artifactsResult.count || 0,
  }
}

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await getUserProfile(user.id)
  const stats = await getUserStats(user.id)

  const displayName = profile?.display_name || user.email?.split("@")[0] || "User"
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown"

  return (
    <AppLayout user={user}>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-sm rounded-sm">
                <svg
                  width="24"
                  height="26"
                  viewBox="0 0 80 90"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                >
                  <path d="M39.6001 90L52.1001 82.7L39.6001 75.5L27.1001 82.7L39.6001 90Z" fill="currentColor" />
                  <path d="M2.0001 68.3L14.6001 75.5L27.1001 68.3L14.6001 61L2.0001 68.3Z" fill="currentColor" />
                  <path d="M77.2002 68.3L64.6002 61L52.1002 68.3L64.6002 75.5L77.2002 68.3Z" fill="currentColor" />
                  <path d="M39.6001 61L52.1001 53.8L39.6001 46.6L27.1001 53.8L39.6001 61Z" fill="currentColor" />
                  <path d="M39.6001 75.5L52.1001 68.3L39.6001 61L27.1001 68.3L39.6001 75.5Z" fill="currentColor" />
                  <path d="M37.6001 43.3L37.6001 28.9L25.1001 36.1L25.1001 50.5L37.6001 43.3Z" fill="currentColor" />
                  <path d="M12.6001 43.3L0.0001 50.5L0 65L12.6001 57.8L12.6001 43.3Z" fill="currentColor" />
                  <path d="M37.6001 0L25.1001 7.2L25.1001 21.6L37.6001 14.4L37.6001 0Z" fill="currentColor" />
                  <path d="M0 21.6L0 36.1L12.6001 28.9L12.6001 14.4L0 21.6Z" fill="currentColor" />
                  <path d="M25.1001 21.6L12.6001 28.9L12.6001 43.3L25.1001 36.1L25.1001 21.6Z" fill="currentColor" />
                  <path d="M41.6001 43.3L54.1001 50.5L54.1001 36.1L41.6001 28.9L41.6001 43.3Z" fill="currentColor" />
                  <path d="M79.2002 65L79.2002 50.5L66.6002 43.3L66.6002 57.8L79.2002 65Z" fill="currentColor" />
                  <path d="M54.1001 7.2L41.6001 0L41.6001 14.4L54.1001 21.6L54.1001 7.2Z" fill="currentColor" />
                  <path d="M79.2002 21.6L66.6002 14.4L66.6002 28.9L79.2002 36.1L79.2002 21.6Z" fill="currentColor" />
                  <path d="M66.6001 43.3L66.6001 28.9L54.1001 21.6L54.1001 36.1L66.6001 43.3Z" fill="currentColor" />
                </svg>
              </div>
              My Profile
            </h1>
            <p className="mt-1 text-muted-foreground">View and manage your account information</p>
          </div>
          <LogoutButton />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your personal account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-2xl">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{displayName}</h3>
                  <p className="text-sm text-muted-foreground">Member since {joinedDate}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Display Name</p>
                    <p className="text-sm text-muted-foreground">{profile?.display_name || "Not set"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Joined</p>
                    <p className="text-sm text-muted-foreground">{joinedDate}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Heirlooms</CardTitle>
              <CardDescription>Overview of your collections and artifacts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Collections</p>
                    <p className="text-2xl font-bold">{stats.collectionsCount}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Artifacts</p>
                    <p className="text-2xl font-bold">{stats.artifactsCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>App Preferences</CardTitle>
            </div>
            <CardDescription>Customize your app experience</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemePreferenceToggle initialTheme={profile?.theme_preference || "light"} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
