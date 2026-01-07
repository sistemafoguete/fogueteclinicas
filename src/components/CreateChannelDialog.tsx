import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/ui/required-label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus } from "lucide-react";

interface Profile {
  user_id: string;
  name: string;
  employee_role: string;
}

interface CreateChannelDialogProps {
  onChannelCreated?: () => void;
}

export const CreateChannelDialog = ({ onChannelCreated }: CreateChannelDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadProfiles();
    }
  }, [open]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, employee_role')
        .neq('user_id', user?.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar a lista de usuários.",
      });
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome do grupo é obrigatório.",
      });
      return;
    }

    if (!isPublic && selectedMembers.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos um membro para grupos privados.",
      });
      return;
    }

    setLoading(true);

    try {
      // Criar canal
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          is_public: isPublic,
          created_by: user?.id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Adicionar criador como membro
      const membersToAdd = [user?.id, ...selectedMembers];
      
      const { error: membersError } = await supabase
        .from('channel_members')
        .insert(
          membersToAdd.map(userId => ({
            channel_id: channel.id,
            user_id: userId
          }))
        );

      if (membersError) throw membersError;

      toast({
        title: "Grupo criado!",
        description: `O grupo "${name}" foi criado com sucesso.`,
      });

      setOpen(false);
      setName("");
      setDescription("");
      setIsPublic(true);
      setSelectedMembers([]);
      
      if (onChannelCreated) {
        onChannelCreated();
      }
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o grupo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Grupo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Criar Novo Grupo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <RequiredLabel htmlFor="channel-name">Nome do Grupo</RequiredLabel>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Equipe Madre"
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">Descrição</Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do grupo"
              rows={2}
              maxLength={200}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-public"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            />
            <Label htmlFor="is-public" className="text-sm cursor-pointer">
              Grupo público (todos podem ver)
            </Label>
          </div>

          {!isPublic && (
            <div className="space-y-2">
              <Label>Membros do Grupo</Label>
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                  {profiles.map((profile) => (
                    <div
                      key={profile.user_id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => toggleMember(profile.user_id)}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(profile.user_id)}
                        onCheckedChange={() => toggleMember(profile.user_id)}
                      />
                      <span className="text-sm flex-1">{profile.name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {selectedMembers.length} membro(s) selecionado(s)
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Grupo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
