import { AppLayout } from "@/components/app-layout"
import { getCurrentUser, createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { redirect } from "next/navigation"
import { Package, ImageIcon, Calendar, Mail, User, Settings } from "lucide-react"
import { ThemePreferenceToggle } from "@/components/theme-preference-toggle"

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="mt-1 text-muted-foreground">View and manage your account information</p>
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
