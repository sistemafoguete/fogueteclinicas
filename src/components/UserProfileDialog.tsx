import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UserAvatar } from '@/components/UserAvatar';
import { Camera, Upload, Trash2, Loader2, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserProfileDialog = ({ open, onOpenChange }: UserProfileDialogProps) => {
  const { user } = useAuth();
  const { profile, refetch } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Tipo inválido',
        description: 'Por favor, selecione uma imagem (JPG, PNG, etc.)',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 5MB.',
      });
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user?.id) return;

    setUploading(true);
    try {
      // Generate unique file name
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de perfil foi salva com sucesso.',
      });

      // Clear preview and refresh data
      setPreviewUrl(null);
      setSelectedFile(null);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar foto',
        description: error.message || 'Não foi possível atualizar sua foto.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;

    setRemoving(true);
    try {
      // Delete avatar files from storage
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Foto removida',
        description: 'Sua foto de perfil foi removida.',
      });

      await refetch();
      queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover foto',
        description: error.message || 'Não foi possível remover sua foto.',
      });
    } finally {
      setRemoving(false);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    onOpenChange(false);
  };

  const currentAvatarUrl = previewUrl || (profile as any)?.avatar_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Meu Perfil
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Avatar Preview */}
          <div className="relative group">
            <UserAvatar 
              name={profile?.name}
              avatarUrl={currentAvatarUrl}
              role={profile?.employee_role}
              size="xl"
              className="h-32 w-32 text-4xl"
            />
            
            {/* Overlay with camera icon */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              disabled={uploading}
            >
              <Camera className="h-8 w-8 text-white" />
            </button>
          </div>

          {/* User Info */}
          <div className="text-center">
            <h3 className="font-semibold text-lg">{profile?.name || 'Usuário'}</h3>
            <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Escolher Foto
            </Button>

            {(profile as any)?.avatar_url && !previewUrl && (
              <Button
                variant="outline"
                onClick={handleRemoveAvatar}
                disabled={uploading || removing}
                className="text-destructive hover:text-destructive"
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remover
              </Button>
            )}
          </div>

          {previewUrl && (
            <p className="text-sm text-muted-foreground">
              Clique em "Salvar" para aplicar a nova foto
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleCancel} disabled={uploading}>
            Cancelar
          </Button>
          {selectedFile && (
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
