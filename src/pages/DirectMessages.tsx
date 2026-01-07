import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Search, MessageCircle, Users, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  user_id: string;
  name: string;
  employee_role: string;
  is_active: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  message_body: string;
  message_type?: string;
  priority?: string;
  created_at: string;
  is_read: boolean;
  metadata?: any;
  sender?: User;
}

interface Conversation {
  user: User;
  lastMessage?: Message;
  unreadCount: number;
}

export default function DirectMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUsers();
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser.user_id);
      markMessagesAsRead(selectedUser.user_id);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel('direct-messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_messages',
          filter: `recipient_id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.new.sender_id === selectedUser?.user_id) {
            loadMessages(selectedUser.user_id);
            markMessagesAsRead(selectedUser.user_id);
          }
          loadConversations();
          toast({
            title: "Nova mensagem",
            description: "Você recebeu uma nova mensagem",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, employee_role, is_active')
        .eq('is_active', true)
        .neq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const { data: messagesData, error } = await supabase
        .from('internal_messages')
        .select('*')
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!messagesData || messagesData.length === 0) {
        setConversations([]);
        return;
      }

      const userIds = [...new Set([
        ...messagesData.map(m => m.sender_id),
        ...messagesData.map(m => m.recipient_id)
      ])].filter(id => id !== user?.id);

      const { data: usersData } = await supabase
        .from('profiles')
        .select('user_id, name, employee_role, is_active')
        .in('user_id', userIds);

      const usersMap = new Map(usersData?.map(u => [u.user_id, u]));

      const conversationsMap = new Map<string, Conversation>();
      
      messagesData.forEach((msg) => {
        const otherUserId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
        const otherUser = usersMap.get(otherUserId);
        
        if (!otherUser) return;
        
        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            user: otherUser,
            lastMessage: msg as Message,
            unreadCount: 0
          });
        }
        
        if (msg.recipient_id === user?.id && !msg.is_read) {
          const conv = conversationsMap.get(otherUserId);
          if (conv) {
            conv.unreadCount++;
          }
        }
      });

      setConversations(Array.from(conversationsMap.values()));
    } catch (error) {
      console.error('Erro ao carregar conversações:', error);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('internal_messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map(m => m.sender_id))];
        const { data: sendersData } = await supabase
          .from('profiles')
          .select('user_id, name, employee_role, is_active')
          .in('user_id', senderIds);
        
        const sendersMap = new Map(sendersData?.map(s => [s.user_id, s]));
        
        const messagesWithSender = data.map(msg => ({
          ...msg,
          sender: sendersMap.get(msg.sender_id)
        })) as Message[];
        
        setMessages(messagesWithSender);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (senderId: string) => {
    try {
      await supabase
        .from('internal_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', user?.id)
        .eq('sender_id', senderId)
        .eq('is_read', false);
      
      loadConversations();
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !user?.id) return;

    try {
      const { error } = await supabase
        .from('internal_messages')
        .insert({
          sender_id: user.id,
          recipient_id: selectedUser.user_id,
          subject: 'Mensagem Direta',
          message_body: newMessage.trim(),
          message_type: 'general',
          priority: 'normal'
        });

      if (error) throw error;

      setNewMessage('');
      await loadMessages(selectedUser.user_id);
      await loadConversations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar mensagem",
        description: error.message || "Não foi possível enviar a mensagem.",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 space-y-6">
      {/* Header moderno com gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <MessageCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Mensagens Diretas</h1>
              <p className="text-purple-100 mt-1">
                Converse com outros usuários do sistema
              </p>
            </div>
          </div>
          {totalUnread > 0 && (
            <Badge className="bg-white text-purple-600 text-sm px-4 py-2 shadow-lg">
              <Mail className="w-4 h-4 mr-2" />
              {totalUnread} não lidas
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Conversas */}
        <Card className="lg:col-span-1 border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-600" />
              Conversas
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/80"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {/* Conversas existentes */}
              {conversations.length > 0 && (
                <div className="border-b">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                    CONVERSAS RECENTES
                  </div>
                  {conversations.map((conv) => (
                    <button
                      key={conv.user.user_id}
                      onClick={() => setSelectedUser(conv.user)}
                      className={`w-full px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent dark:hover:from-purple-950/30 ${
                        selectedUser?.user_id === conv.user.user_id 
                          ? 'bg-gradient-to-r from-purple-100 to-fuchsia-50 dark:from-purple-950/50 border-l-4 border-purple-500' 
                          : ''
                      }`}
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                        <AvatarFallback className={`${getAvatarColor(conv.user.name)} text-white font-medium`}>
                          {getInitials(conv.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{conv.user.name}</p>
                          {conv.unreadCount > 0 && (
                            <Badge className="bg-purple-500 text-white text-xs shrink-0">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage?.message_body}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Todos os usuários */}
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                  TODOS OS USUÁRIOS ({filteredUsers.length})
                </div>
                {filteredUsers.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                )}
                {filteredUsers.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:bg-muted/50 ${
                      selectedUser?.user_id === u.user_id ? 'bg-muted' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                      <AvatarFallback className={`${getAvatarColor(u.name)} text-white font-medium`}>
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.employee_role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Área de Chat */}
        <Card className="lg:col-span-2 border-0 shadow-lg overflow-hidden">
          {selectedUser ? (
            <>
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 via-fuchsia-50 to-pink-50 dark:from-purple-950/30 dark:via-fuchsia-950/30 dark:to-pink-950/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                    <AvatarFallback className={`${getAvatarColor(selectedUser.name)} text-white font-semibold text-lg`}>
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedUser.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedUser.employee_role}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0 flex flex-col h-[500px]">
                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Carregando mensagens...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
                        <MessageCircle className="w-8 h-8 text-purple-500" />
                      </div>
                      <p className="text-muted-foreground">Nenhuma mensagem ainda.</p>
                      <p className="text-sm text-muted-foreground">Comece a conversar!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isOwn = msg.sender_id === user?.id;
                        
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                                isOwn 
                                  ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white rounded-tr-none' 
                                  : 'bg-muted rounded-tl-none'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.message_body}</p>
                              <p className={`text-xs mt-2 ${isOwn ? 'text-purple-100' : 'text-muted-foreground'}`}>
                                {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t bg-muted/30">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 bg-background"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim()}
                      className="bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[600px] text-center p-8">
              <div className="p-6 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/30 mb-4">
                <MessageCircle className="w-16 h-16 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Selecione uma conversa</h3>
              <p className="text-muted-foreground max-w-sm">
                Escolha um usuário na lista ao lado para iniciar ou continuar uma conversa
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
