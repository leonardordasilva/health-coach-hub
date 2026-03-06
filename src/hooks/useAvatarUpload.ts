import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function useAvatarUpload() {
  const { profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Apenas imagens são permitidas (JPEG, PNG, WebP, GIF).");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      await refreshProfile();
      toast.success("Foto de perfil atualizada!");
    } catch {
      toast.error("Erro ao fazer upload da foto.");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    }
  };

  return { uploading, handleUpload };
}
