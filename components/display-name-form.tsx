"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateDisplayName } from "@/lib/actions/profile"
import { Pencil, Check, X } from 'lucide-react'

interface DisplayNameFormProps {
  currentDisplayName: string | null
  userId: string
}

export function DisplayNameForm({ currentDisplayName, userId }: DisplayNameFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(currentDisplayName || "")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError("Display name cannot be empty")
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await updateDisplayName(displayName.trim())

    setIsLoading(false)

    if (result.success) {
      setIsEditing(false)
    } else {
      setError(result.error || "Failed to update display name")
    }
  }

  const handleCancel = () => {
    setDisplayName(currentDisplayName || "")
    setError(null)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{displayName || "Not set"}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8 p-0"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter display name"
          disabled={isLoading}
          className="h-9"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isLoading}
          className="h-9 w-9 p-0"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isLoading}
          className="h-9 w-9 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
