import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { uploadService } from "../../services/upload"
import { authService } from "../../services/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, UploadCloud, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuthStore } from "../../hooks/useAuthStore"

export function PaymentProofUpload({ currentKey }: { currentKey?: string | null }) {
  const [file, setFile] = useState<File | null>(null)
  const queryClient = useQueryClient()
  const { setUser } = useAuthStore()

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      // 1. Get presigned URL
      const { url, key } = await uploadService.getPaymentProofUrl({
        filename: selectedFile.name,
        contentType: selectedFile.type,
        size: selectedFile.size,
      })

      // 2. Upload to R2 directly
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      })

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage")
      }

      // 3. Confirm with backend
      await uploadService.confirmPaymentProof({ r2Key: key })
      
      // Update local profile
      const userRes = await authService.getCurrentUser()
      if (userRes) setUser(userRes)
      return key
    },
    onSuccess: () => {
      toast.success("Payment proof uploaded successfully!")
      setFile(null)
      queryClient.invalidateQueries({ queryKey: ["profile"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to upload file")
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = () => {
    if (!file) return
    uploadMutation.mutate(file)
  }

  return (
    <Card className="shadow-sm border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Payment Proof
          {currentKey && <CheckCircle2 className="h-5 w-5 text-success" />}
        </CardTitle>
        <CardDescription>
          {currentKey 
            ? "You have already uploaded proof. You can upload a new one to replace it if needed."
            : "Please upload a screenshot or PDF of your payment receipt."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadMutation.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Upload Failed</AlertTitle>
            <AlertDescription>
              {(uploadMutation.error as any).message || "An error occurred during upload."}
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="proof">Select Receipt (Image or PDF)</Label>
          <Input 
            id="proof" 
            type="file" 
            accept="image/jpeg, image/png, image/webp, application/pdf" 
            onChange={handleFileChange}
            disabled={uploadMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">Max size: 10MB</p>
        </div>
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploadMutation.isPending}
          className="w-full sm:w-auto"
        >
          {uploadMutation.isPending ? "Uploading..." : <><UploadCloud className="h-4 w-4 mr-2" /> Upload Document</>}
        </Button>
      </CardContent>
    </Card>
  )
}
