"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Package, ImageIcon, Calendar, Mail, User, Settings, Lock } from "lucide-react"
import { ThemePreferenceToggle } from "@/components/theme-preference-toggle"
import { PasswordForm } from "@/components/password-form"
import { DisplayNameForm } from "@/components/display-name-form"
import { ProfileStatLink } from "@/components/profile-stat-link"

interface ProfileTabsProps {
  user: {
    id: string
    email?: string
  }
  profile: {
    display_name?: string | null
    created_at?: string | null
    theme_preference?: string | null
  } | null
  stats: {
    collectionsCount: number
    artifactsCount: number
  }
  showPasswordUI: boolean
  passwordMode: "change" | "set"
}

export function ProfileTabs({ user, profile, stats, showPasswordUI, passwordMode }: ProfileTabsProps) {
  const displayName = profile?.display_name || user.email?.split("@")[0] || "User"
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown"

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="profile" className="gap-2">
          <User className="h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="heirlooms" className="gap-2">
          <Package className="h-4 w-4" />
          Heirlooms
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <Card className="animate-fade-in">
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
                  <DisplayNameForm currentDisplayName={profile?.display_name} userId={user.id} />
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
      </TabsContent>

      <TabsContent value="heirlooms" className="mt-6">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Your Heirlooms</CardTitle>
            <CardDescription>Overview of your collections and artifacts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileStatLink
              href="/collections"
              icon={<Package className="h-5 w-5 text-primary" />}
              label="Collections"
              count={stats.collectionsCount}
              storageKey="heirloom-collections-tab"
              targetTab="mine"
            />

            <ProfileStatLink
              href="/artifacts"
              icon={<ImageIcon className="h-5 w-5 text-primary" />}
              label="Artifacts"
              count={stats.artifactsCount}
              storageKey="heirloom-artifacts-tab"
              targetTab="mine"
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="mt-6 space-y-6">
        {showPasswordUI && (
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>{passwordMode === "change" ? "Change Password" : "Set Password"}</CardTitle>
              </div>
              <CardDescription>
                {passwordMode === "change"
                  ? "Update your account password for enhanced security"
                  : "Set a password to enable email/password login in addition to magic links"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm mode={passwordMode} />
            </CardContent>
          </Card>
        )}

        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>App Preferences</CardTitle>
            </div>
            <CardDescription>Customize your app experience</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemePreferenceToggle />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
