import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface TypingIndicatorProps {
  channelId?: string | null;
  recipientId?: string | null;
}

interface TypingUser {
  user_id: string;
  name: string;
  timestamp: number;
}

export const TypingIndicator = ({ channelId, recipientId }: TypingIndicatorProps) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!channelId && !recipientId) return;

    const channel = supabase.channel(`typing-${channelId || recipientId}`);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];
        
        Object.keys(state).forEach(key => {
          const presences = state[key] as any[];
          presences.forEach(presence => {
            if (presence.user_id !== user?.id) {
              users.push({
                user_id: presence.user_id,
                name: presence.name,
                timestamp: presence.timestamp
              });
            }
          });
        });
        
        // Remove old typing indicators (older than 3 seconds)
        const now = Date.now();
        const activeUsers = users.filter(u => now - u.timestamp < 3000);
        setTypingUsers(activeUsers);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, recipientId, user?.id]);

  // Clean up old typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now();
        return prev.filter(u => now - u.timestamp < 3000);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} está digitando...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} e ${typingUsers[1].name} estão digitando...`;
    } else {
      return `${typingUsers.length} pessoas estão digitando...`;
    }
  };

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground italic">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span>{getTypingText()}</span>
      </div>
    </div>
  );
};