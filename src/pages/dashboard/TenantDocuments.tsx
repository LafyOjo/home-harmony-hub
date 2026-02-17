import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, FileText } from "lucide-react";

const categories = [
  { value: "id", label: "Photo ID" },
  { value: "proof_of_address", label: "Proof of Address" },
  { value: "payslips", label: "Payslips" },
  { value: "bank_statements", label: "Bank Statements" },
  { value: "employment_contract", label: "Employment Contract" },
  { value: "other", label: "Other" },
];

type Doc = {
  id: string;
  file_name: string;
  category: string;
  created_at: string;
};

export default function TenantDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [category, setCategory] = useState("id");
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async () => {
    if (!user) return;
    const { data } = await supabase.from("documents").select("id, file_name, category, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    setDocs((data as Doc[]) || []);
  };

  useEffect(() => { fetchDocs(); }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const key = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("documents").upload(key, file);
    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    await supabase.from("documents").insert({
      user_id: user.id,
      category,
      file_name: file.name,
      storage_key: key,
      file_size: file.size,
      content_type: file.type,
    });
    toast({ title: "Document uploaded" });
    setUploading(false);
    fetchDocs();
  };

  const handleDelete = async (doc: Doc) => {
    if (!user) return;
    const fullDoc = await supabase.from("documents").select("storage_key").eq("id", doc.id).single();
    if (fullDoc.data) {
      await supabase.storage.from("documents").remove([fullDoc.data.storage_key]);
    }
    await supabase.from("documents").delete().eq("id", doc.id);
    toast({ title: "Document deleted" });
    fetchDocs();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-6">Document Vault</h1>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="font-medium text-sm mb-4">Upload Document</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex-1">
            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            <Button variant="outline" className="w-full gap-2" disabled={uploading} asChild>
              <span><Upload className="w-4 h-4" />{uploading ? "Uploading..." : "Choose File"}</span>
            </Button>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
        {docs.map(doc => (
          <div key={doc.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.file_name}</p>
              <p className="text-xs text-muted-foreground">{categories.find(c => c.value === doc.category)?.label}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
