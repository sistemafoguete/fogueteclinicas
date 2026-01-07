import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateChannelDialog } from '@/components/CreateChannelDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS } from '@/hooks/useRolePermissions';
import { 
  Send, 
  MessageCircle, 
  ArrowLeft,
  Search,
  Users,
  Phone,
  Video,
  Smile,
  Paperclip,
  Image,
  Mic,
  MoreVertical,
  Hash
} from 'lucide-react';

interface Contact {
  user_id: string;
  name: string;
  employee_role: string;
  email: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  avatar?: string;
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  member_count: number;
}

interface ChatMessage {
  id: string;
  message_body: string;
  sender_id: string;
  recipient_id: string | null;
  channel_id: string | null;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
}

export const MessagingApp = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile] = useState(window.innerWidth < 768);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    console.log('MessagingApp: Iniciando...');
    if (user?.id) {
      console.log('MessagingApp: Usuário logado:', user.id);
      loadUserRole();
      loadContacts();
      loadChannels();
      setupRealtimeSubscription();
    } else {
      console.log('MessagingApp: Usuário não logado');
    }
  }, [user]);

  const loadUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('employee_role')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setUserRole(data?.employee_role || null);
    } catch (error) {
      console.error('Erro ao carregar papel do usuário:', error);
    }
  };

  useEffect(() => {
    if (selectedContact && user?.id) {
      console.log('MessagingApp: Carregando mensagens para contato:', selectedContact);
      setSelectedChannel(null);
      loadDirectMessages(selectedContact);
    }
  }, [selectedContact, user]);

  useEffect(() => {
    if (selectedChannel && user?.id) {
      console.log('MessagingApp: Carregando mensagens para canal:', selectedChannel);
      setSelectedContact(null);
      loadChannelMessages(selectedChannel);
    }
  }, [selectedChannel, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadContacts = async () => {
    try {
      console.log('MessagingApp: Carregando contatos...');
      
      // Buscar todos os usuários ativos exceto o usuário atual
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, name, employee_role, email')
        .neq('user_id', user?.id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('MessagingApp: Erro ao carregar profiles:', error);
        throw error;
      }

      console.log('MessagingApp: Profiles carregados:', profiles?.length || 0);

      if (!profiles || profiles.length === 0) {
        console.log('MessagingApp: Nenhum profile encontrado');
        setContacts([]);
        return;
      }

      // Para cada contato, buscar última mensagem e contagem não lidas
      const contactsWithMessages = await Promise.all(
        profiles.map(async (profile) => {
          try {
            // Última mensagem entre os usuários
            const { data: lastMessage, error: msgError } = await supabase
              .from('internal_messages')
              .select('message_body, created_at')
              .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${profile.user_id}),and(sender_id.eq.${profile.user_id},recipient_id.eq.${user?.id})`)
              .is('channel_id', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (msgError) {
              console.error('MessagingApp: Erro ao buscar última mensagem:', msgError);
            }

            // Mensagens não lidas deste usuário para mim
            const { count: unreadCount, error: countError } = await supabase
              .from('internal_messages')
              .select('*', { count: 'exact' })
              .eq('sender_id', profile.user_id)
              .eq('recipient_id', user?.id)
              .eq('is_read', false)
              .is('channel_id', null);

            if (countError) {
              console.error('MessagingApp: Erro ao contar mensagens não lidas:', countError);
            }

            return {
              user_id: profile.user_id,
              name: profile.name || 'Usuário',
              employee_role: profile.employee_role || 'staff',
              email: profile.email || '',
              last_message: lastMessage?.message_body,
              last_message_time: lastMessage?.created_at,
              unread_count: unreadCount || 0
            } as Contact;
          } catch (contactError) {
            console.error('MessagingApp: Erro ao processar contato:', contactError);
            return {
              user_id: profile.user_id,
              name: profile.name || 'Usuário',
              employee_role: profile.employee_role || 'staff',
              email: profile.email || '',
              unread_count: 0
            } as Contact;
          }
        })
      );

      // Ordenar contatos: não lidas primeiro, depois por última mensagem
      contactsWithMessages.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (b.unread_count > 0 && a.unread_count === 0) return 1;
        
        if (a.last_message_time && b.last_message_time) {
          return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
        }
        if (a.last_message_time) return -1;
        if (b.last_message_time) return 1;
        return a.name.localeCompare(b.name);
      });

      console.log('MessagingApp: Contatos processados:', contactsWithMessages.length);
      setContacts(contactsWithMessages);
      
    } catch (error) {
      console.error('MessagingApp: Erro geral ao carregar contatos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os contatos.",
      });
    }
  };

  const loadChannels = async () => {
    try {
      console.log('MessagingApp: Carregando canais...');
      
      // Buscar canais que o usuário é membro ou que são públicos
      const { data: userChannels, error: channelsError } = await supabase
        .from('channels')
        .select(`
          id,
          name,
          description,
          is_public
        `)
        .order('name');

      if (channelsError) {
        console.error('Erro ao carregar canais:', channelsError);
        throw channelsError;
      }

      if (!userChannels || userChannels.length === 0) {
        setChannels([]);
        return;
      }

      // Para cada canal, buscar última mensagem e contagem não lidas
      const channelsWithMessages = await Promise.all(
        userChannels.map(async (channel) => {
          try {
            // Última mensagem do canal
            const { data: lastMessage } = await supabase
              .from('internal_messages')
              .select('message_body, created_at')
              .eq('channel_id', channel.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // Mensagens não lidas do canal
            const { count: unreadCount } = await supabase
              .from('internal_messages')
              .select('*', { count: 'exact' })
              .eq('channel_id', channel.id)
              .neq('sender_id', user?.id)
              .eq('is_read', false);

            // Contar membros
            const { count: memberCount } = await supabase
              .from('channel_members')
              .select('*', { count: 'exact' })
              .eq('channel_id', channel.id);

            return {
              id: channel.id,
              name: channel.name,
              description: channel.description,
              is_public: channel.is_public,
              last_message: lastMessage?.message_body,
              last_message_time: lastMessage?.created_at,
              unread_count: unreadCount || 0,
              member_count: memberCount || 0
            } as Channel;
          } catch (error) {
            console.error('Erro ao processar canal:', error);
            return {
              id: channel.id,
              name: channel.name,
              description: channel.description,
              is_public: channel.is_public,
              unread_count: 0,
              member_count: 0
            } as Channel;
          }
        })
      );

      setChannels(channelsWithMessages);
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os grupos.",
      });
    }
  };

  const loadDirectMessages = async (contactUserId: string) => {
    try {
      console.log('MessagingApp: Carregando mensagens diretas com:', contactUserId);
      
      const { data, error } = await supabase
        .from('internal_messages')
        .select('id, message_body, sender_id, recipient_id, channel_id, created_at, is_read')
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${contactUserId}),and(sender_id.eq.${contactUserId},recipient_id.eq.${user?.id})`)
        .is('channel_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messagesWithNames = data?.map(msg => ({
        ...msg,
        sender_name: undefined
      })) || [];

      setMessages(messagesWithNames);

      // Marcar mensagens como lidas
      await supabase
        .from('internal_messages')
        .update({ is_read: true })
        .eq('sender_id', contactUserId)
        .eq('recipient_id', user?.id)
        .eq('is_read', false)
        .is('channel_id', null);

      loadContacts();
    } catch (error) {
      console.error('Erro ao carregar mensagens diretas:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as mensagens.",
      });
    }
  };

  const loadChannelMessages = async (channelId: string) => {
    try {
      console.log('MessagingApp: Carregando mensagens do canal:', channelId);
      
      const { data, error } = await supabase
        .from('internal_messages')
        .select(`
          id,
          message_body,
          sender_id,
          recipient_id,
          channel_id,
          created_at,
          is_read
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Buscar nomes dos remetentes
      const senderIds = [...new Set(data?.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

      const messagesWithNames = data?.map(msg => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id)
      })) || [];

      setMessages(messagesWithNames);

      // Marcar mensagens como lidas
      await supabase
        .from('internal_messages')
        .update({ is_read: true })
        .eq('channel_id', channelId)
        .neq('sender_id', user?.id)
        .eq('is_read', false);

      loadChannels();
    } catch (error) {
      console.error('Erro ao carregar mensagens do canal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as mensagens do grupo.",
      });
    }
  };

  const loadMessages = loadDirectMessages;

  const setupRealtimeSubscription = () => {
    console.log('MessagingApp: Configurando subscription em tempo real...');
    
    const subscription = supabase
      .channel('messaging_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_messages',
        },
        async (payload) => {
          console.log('MessagingApp: Nova mensagem recebida:', payload);
          
          const newMessage = payload.new as ChatMessage;
          
          // Se a mensagem é para mim ou de mim para o contato selecionado
          if (selectedContact && (
            (newMessage.sender_id === selectedContact && newMessage.recipient_id === user?.id) ||
            (newMessage.sender_id === user?.id && newMessage.recipient_id === selectedContact)
          )) {
            console.log('MessagingApp: Atualizando conversa atual');
            await loadMessages(selectedContact);
          }
          
          // Sempre recarregar contatos para atualizar contadores
          await loadContacts();
        }
      )
      .subscribe((status) => {
        console.log('MessagingApp: Status da subscription:', status);
      });

    return () => {
      console.log('MessagingApp: Removendo subscription');
      subscription.unsubscribe();
    };
  };

  const sendMessage = async (messageType: 'text' | 'emoji' | 'file' = 'text') => {
    if (!messageText.trim() || loading || (!selectedContact && !selectedChannel) || !user?.id) {
      console.log('MessagingApp: Não é possível enviar - dados inválidos');
      return;
    }

    setLoading(true);
    console.log('MessagingApp: Enviando mensagem...');

    try {
      const messageData: any = {
        sender_id: user.id,
        message_body: messageText.trim(),
        subject: selectedChannel ? 'Mensagem de grupo' : 'Mensagem direta',
        message_type: 'general',
        is_read: false
      };

      if (selectedChannel) {
        messageData.channel_id = selectedChannel;
        messageData.recipient_id = null;
      } else {
        messageData.recipient_id = selectedContact;
        messageData.channel_id = null;
      }

      console.log('MessagingApp: Dados da mensagem:', messageData);

      const { data, error } = await supabase
        .from('internal_messages')
        .insert(messageData)
        .select('*')
        .single();

      if (error) {
        console.error('MessagingApp: Erro ao inserir mensagem:', error);
        throw error;
      }

      console.log('MessagingApp: Mensagem enviada:', data);

      // Adicionar mensagem à lista atual
      if (data) {
        setMessages(prev => [...prev, {
          id: data.id,
          message_body: data.message_body,
          sender_id: data.sender_id,
          recipient_id: data.recipient_id,
          channel_id: data.channel_id,
          created_at: data.created_at,
          is_read: data.is_read
        }]);
      }

      setMessageText('');
      setShowEmojiPicker(false);
      
      // Recarregar contatos/canais para atualizar ordem
      if (selectedChannel) {
        await loadChannels();
      } else {
        await loadContacts();
      }
      
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso!",
      });

    } catch (error) {
      console.error('MessagingApp: Erro geral ao enviar mensagem:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    setIsTyping(true);
    // Simular parar de digitar após 1 segundo
    setTimeout(() => setIsTyping(false), 1000);
  };

  const insertEmoji = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const commonEmojis = ['😀', '😂', '❤️', '👍', '👎', '🔥', '✨', '💯', '🎉', '👌', '🙏', '💪'];

  const sendQuickMessage = (message: string) => {
    setMessageText(message);
    setTimeout(() => sendMessage(), 100);
  };

  const quickMessages = [
    "Oi! 👋",
    "Tudo bem?",
    "Obrigado! 🙏", 
    "De nada 😊",
    "Pode deixar 👍",
    "Vou verificar",
    "Já estou indo",
    "Até mais! 👋"
  ];

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      director: 'bg-purple-600',
      coordinator_madre: 'bg-blue-600',
      coordinator_floresta: 'bg-green-600',
      physiotherapist: 'bg-orange-600',
      therapist: 'bg-teal-600',
      receptionist: 'bg-pink-600',
      staff: 'bg-gray-600'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-600';
  };

  const getRoleLabel = (role: string) => {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || 'Funcionário(a)';
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedContactInfo = contacts.find(c => c.user_id === selectedContact);
  const selectedChannelInfo = channels.find(c => c.id === selectedChannel);

  // Layout mobile: mostrar lista ou chat
  const showChatInMobile = isMobile && (selectedContact || selectedChannel);
  const showContactsList = !isMobile || !(selectedContact || selectedChannel);

  const canCreateChannel = userRole === 'director' || 
                           userRole === 'coordinator_madre' || 
                           userRole === 'coordinator_floresta';

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background border rounded-lg overflow-hidden">
      {/* Lista de Contatos/Grupos */}
      {showContactsList && (
        <div className={`${isMobile ? 'w-full' : 'w-80'} border-r bg-background flex flex-col`}>
          {/* Header */}
          <div className="p-4 border-b bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Mensagens
              </h2>
              {canCreateChannel && (
                <CreateChannelDialog onChannelCreated={() => {
                  loadChannels();
                }} />
              )}
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Tabs: Diretas e Grupos */}
          <Tabs defaultValue="direct" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
              <TabsTrigger value="direct" className="text-xs">
                <Users className="h-4 w-4 mr-1" />
                Diretas
              </TabsTrigger>
              <TabsTrigger value="groups" className="text-xs">
                <Hash className="h-4 w-4 mr-1" />
                Grupos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="flex-1 overflow-hidden mt-2">
              <ScrollArea className="h-full">
                <div className="p-2">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum contato encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredContacts.map((contact) => (
                        <Button
                          key={contact.user_id}
                          variant={selectedContact === contact.user_id ? "secondary" : "ghost"}
                          className="w-full justify-start p-3 h-auto hover:bg-muted/80"
                          onClick={() => {
                            setSelectedContact(contact.user_id);
                            setSelectedChannel(null);
                          }}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <Avatar className="h-12 w-12 border-2 border-background">
                              <AvatarFallback className={`text-white font-semibold ${getRoleColor(contact.employee_role)}`}>
                                {contact.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium truncate text-foreground">
                                  {contact.name}
                                </span>
                                {contact.unread_count > 0 && (
                                  <Badge variant="destructive" className="text-xs min-w-[20px] h-5">
                                    {contact.unread_count > 99 ? '99+' : contact.unread_count}
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-xs text-muted-foreground mb-1">
                                {getRoleLabel(contact.employee_role)}
                              </p>
                              
                              {contact.last_message && (
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-muted-foreground truncate flex-1 mr-2">
                                    {contact.last_message.length > 35 
                                      ? `${contact.last_message.substring(0, 35)}...` 
                                      : contact.last_message
                                    }
                                  </p>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatTime(contact.last_message_time!)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="groups" className="flex-1 overflow-hidden mt-2">
              <ScrollArea className="h-full">
                <div className="p-2">
                  {filteredChannels.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Nenhum grupo encontrado</p>
                      {canCreateChannel && (
                        <p className="text-xs mt-2">Crie seu primeiro grupo!</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredChannels.map((channel) => (
                        <Button
                          key={channel.id}
                          variant={selectedChannel === channel.id ? "secondary" : "ghost"}
                          className="w-full justify-start p-3 h-auto hover:bg-muted/80"
                          onClick={() => {
                            setSelectedChannel(channel.id);
                            setSelectedContact(null);
                          }}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Hash className="h-6 w-6 text-primary" />
                            </div>
                            
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium truncate text-foreground">
                                  {channel.name}
                                </span>
                                {channel.unread_count > 0 && (
                                  <Badge variant="destructive" className="text-xs min-w-[20px] h-5">
                                    {channel.unread_count > 99 ? '99+' : channel.unread_count}
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-xs text-muted-foreground mb-1">
                                {channel.member_count} {channel.member_count === 1 ? 'membro' : 'membros'}
                              </p>
                              
                              {channel.last_message && (
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-muted-foreground truncate flex-1 mr-2">
                                    {channel.last_message.length > 35 
                                      ? `${channel.last_message.substring(0, 35)}...` 
                                      : channel.last_message
                                    }
                                  </p>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatTime(channel.last_message_time!)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Área de Chat */}
      {(!isMobile || showChatInMobile) && (
        <div className="flex-1 flex flex-col bg-background">
          {(selectedContact && selectedContactInfo) || (selectedChannel && selectedChannelInfo) ? (
            <>
              {/* Header do Chat */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isMobile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedContact(null);
                          setSelectedChannel(null);
                        }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {selectedContactInfo ? (
                      <>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={`text-white ${getRoleColor(selectedContactInfo.employee_role)}`}>
                            {selectedContactInfo.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {selectedContactInfo.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {getRoleLabel(selectedContactInfo.employee_role)}
                          </p>
                        </div>
                      </>
                    ) : selectedChannelInfo && (
                      <>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Hash className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {selectedChannelInfo.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedChannelInfo.member_count} {selectedChannelInfo.member_count === 1 ? 'membro' : 'membros'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {selectedContactInfo && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mensagens */}
              <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-muted/20 to-background">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">Nenhuma mensagem ainda</p>
                    <p className="text-sm">
                      {selectedContactInfo 
                        ? `Envie a primeira mensagem para ${selectedContactInfo.name}` 
                        : `Envie a primeira mensagem no grupo`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isCurrentUser = message.sender_id === user?.id;
                      
                      return (
                        <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                            <Card className={`${
                              isCurrentUser 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-card border'
                            } shadow-sm`}>
                              <CardContent className="p-3">
                                {selectedChannel && !isCurrentUser && message.sender_name && (
                                  <p className="text-xs font-semibold mb-1 opacity-70">
                                    {message.sender_name}
                                  </p>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words mb-1">
                                  {message.message_body}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs ${
                                    isCurrentUser 
                                      ? 'text-primary-foreground/70' 
                                      : 'text-muted-foreground'
                                  }`}>
                                    {formatTime(message.created_at)}
                                  </span>
                                  {isCurrentUser && selectedContact && (
                                    <span className={`text-xs ml-2 ${
                                      message.is_read 
                                        ? 'text-blue-400' 
                                        : 'text-primary-foreground/50'
                                    }`}>
                                      {message.is_read ? '✓✓' : '✓'}
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input de Mensagem */}
              <div className="p-4 border-t bg-background">
                <div className="flex gap-3">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedContactInfo 
                      ? `Mensagem para ${selectedContactInfo.name}...` 
                      : `Mensagem para o grupo...`
                    }
                    className="flex-1 bg-muted/50 border-muted"
                    disabled={loading}
                  />
                  <Button 
                    onClick={() => sendMessage()} 
                    disabled={loading || !messageText.trim()}
                    size="lg"
                    className="px-6"
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-muted/20 to-background">
              <div className="text-center text-muted-foreground max-w-md">
                <MessageCircle className="h-20 w-20 mx-auto mb-6 opacity-30" />
                <h3 className="text-xl font-semibold mb-3">Bem-vindo ao Chat</h3>
                <p className="text-sm leading-relaxed">
                  Selecione um contato na lista à esquerda para iniciar uma conversa. 
                  Você pode enviar mensagens diretas para qualquer membro da equipe.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};