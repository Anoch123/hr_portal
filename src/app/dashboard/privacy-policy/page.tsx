"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"
import { Plus, Edit, Trash2, Eye, FileText } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface PrivacyPolicy {
  id: string
  title: string
  content: string
  version: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  updated_by_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export default function PrivacyPolicyPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [policies, setPolicies] = useState<PrivacyPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<PrivacyPolicy | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Permission state
  const [canCreate, setCanCreate] = useState(false)
  const [canUpdate, setCanUpdate] = useState(false)
  const [canDelete, setCanDelete] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    version: "",
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    checkPermissions()
    fetchPolicies()
  }, [session])

  const checkPermissions = async () => {
    if (session?.user?.id) {
      try {
        const res = await fetch("/api/permissions/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permissions: [
              "privacy_policy:create",
              "privacy_policy:update",
              "privacy_policy:delete"
            ]
          })
        })
        if (res.ok) {
          const data = await res.json()
          setCanCreate(data.permissions?.["privacy_policy:create"] || false)
          setCanUpdate(data.permissions?.["privacy_policy:update"] || false)
          setCanDelete(data.permissions?.["privacy_policy:delete"] || false)
        }
      } catch (err) {
        console.error("Error checking permissions:", err)
      }
    }
  }

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/privacy-policy")
      const data = await res.json()
      setPolicies(data.policies || [])
    } catch (err) {
      console.error("Error fetching privacy policies:", err)
      toast({
        title: "Error",
        description: "Failed to fetch privacy policies",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/privacy-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create privacy policy")
        toast({
          title: "Error",
          description: data.error || "Failed to create privacy policy",
          variant: "destructive",
        })
        return
      }

      setPolicies([data, ...policies])
      resetForm()
      setDialogOpen(false)
      toast({
        title: "Success",
        description: "Privacy policy created successfully",
        variant: "success",
      })
    } catch (err) {
      setError("Failed to create privacy policy")
      toast({
        title: "Error",
        description: "Failed to create privacy policy",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPolicy) return

    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/privacy-policy/${selectedPolicy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to update privacy policy")
        toast({
          title: "Error",
          description: data.error || "Failed to update privacy policy",
          variant: "destructive",
        })
        return
      }

      setPolicies(policies.map((p) => (p.id === selectedPolicy.id ? data : p)))
      resetForm()
      setDialogOpen(false)
      setIsEditing(false)
      setSelectedPolicy(null)
      toast({
        title: "Success",
        description: "Privacy policy updated successfully",
        variant: "success",
      })
    } catch (err) {
      setError("Failed to update privacy policy")
      toast({
        title: "Error",
        description: "Failed to update privacy policy",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPolicy) return

    setSubmitting(true)

    try {
      const res = await fetch(`/api/privacy-policy/${selectedPolicy.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        toast({
          title: "Error",
          description: data.error || "Failed to delete privacy policy",
          variant: "destructive",
        })
        return
      }

      setPolicies(policies.filter((p) => p.id !== selectedPolicy.id))
      setDeleteDialogOpen(false)
      setSelectedPolicy(null)
      toast({
        title: "Success",
        description: "Privacy policy deleted successfully",
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete privacy policy",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (policy: PrivacyPolicy) => {
    setSelectedPolicy(policy)
    setFormData({
      title: policy.title,
      content: policy.content,
      version: policy.version || "",
      is_active: policy.is_active,
    })
    setIsEditing(true)
    setDialogOpen(true)
  }

  const openViewDialog = (policy: PrivacyPolicy) => {
    setSelectedPolicy(policy)
    setViewDialogOpen(true)
  }

  const openDeleteDialog = (policy: PrivacyPolicy) => {
    setSelectedPolicy(policy)
    setDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      version: "",
      is_active: true,
    })
    setError("")
  }

  const activePolicy = policies.find((p) => p.is_active)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Manage company privacy policies
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              resetForm()
              setIsEditing(false)
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Policy
          </Button>
        )}
      </div>

      {/* Active Policy Card - Visible to all */}
      {activePolicy && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {activePolicy.title}
                </CardTitle>
                <CardDescription className="mt-4">
                  Current Active Privacy Policy
                  {activePolicy.version && ` - Version ${activePolicy.version}`}
                </CardDescription>
              </div>
              <Badge variant="default" className="bg-green-600">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
              {activePolicy.content}
            </p>
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span>Last updated: {formatDate(activePolicy.updated_at)}</span>
              {activePolicy.updated_by_user && (
                <span>by {activePolicy.updated_by_user.first_name} {activePolicy.updated_by_user.last_name}</span>
              )}
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => openViewDialog(activePolicy)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Read Full Policy
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Policy History - Only for admins */}
      {canUpdate && policies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Policy History</CardTitle>
            <CardDescription>
              All privacy policy versions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{policy.title}</h3>
                      {policy.is_active && (
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      )}
                      {policy.version && (
                        <Badge variant="outline">v{policy.version}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {policy.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>Created: {formatDate(policy.created_at)}</span>
                      {policy.created_by_user && (
                        <span>by {policy.created_by_user.first_name} {policy.created_by_user.last_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openViewDialog(policy)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(policy)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && !policy.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(policy)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Privacy Policy" : "Create Privacy Policy"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the privacy policy details below."
                : "Fill in the details for the new privacy policy."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={isEditing ? handleUpdate : handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter policy title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version (Optional)</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) =>
                    setFormData({ ...formData, version: e.target.value })
                  }
                  placeholder="e.g., 1.0, 2.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Enter the privacy policy content..."
                  rows={15}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_active">
                  Set as active policy (will replace current active policy)
                </Label>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : isEditing
                  ? "Update Policy"
                  : "Create Policy"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPolicy?.title}</DialogTitle>
            <DialogDescription>
              {selectedPolicy?.version && `Version ${selectedPolicy.version}`}
              {selectedPolicy?.is_active && (
                <Badge variant="default" className="ml-2 bg-green-600">
                  Active
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {selectedPolicy?.content}
              </pre>
            </div>
          </div>
          <div className="border-t pt-4 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>
                Created: {selectedPolicy && formatDate(selectedPolicy.created_at)}
                {selectedPolicy?.created_by_user && (
                  <span> by {selectedPolicy.created_by_user.first_name} {selectedPolicy.created_by_user.last_name}</span>
                )}
              </span>
              <span>
                Last updated: {selectedPolicy && formatDate(selectedPolicy.updated_at)}
                {selectedPolicy?.updated_by_user && (
                  <span> by {selectedPolicy.updated_by_user.first_name} {selectedPolicy.updated_by_user.last_name}</span>
                )}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
            >
              Close
            </Button>
            {canUpdate && selectedPolicy && (
              <Button
                onClick={() => {
                  setViewDialogOpen(false)
                  openEditDialog(selectedPolicy)
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Policy
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Privacy Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPolicy?.title}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
