import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  status: string;
  profiles?: {
    name: string;
    employee_role: string;
  };
}

export const usePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    if (!user) return;

    // Set user as online when component mounts
    const setOnline = async () => {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: true,
          status: 'online',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    };

    // Set user as offline when component unmounts or page closes
    const setOffline = async () => {
      await supabase
        .from('user_presence')
        .update({
          is_online: false,
          status: 'offline',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    };

    setOnline();

    // Load initial online users
    const loadOnlineUsers = async () => {
      try {
        const { data: presenceData, error } = await supabase
          .from('user_presence')
          .select('*')
          .eq('is_online', true);

        if (error) {
          console.error('Error loading online users:', error);
          return;
        }

        if (presenceData && presenceData.length > 0) {
          // Get profile info for online users
          const userIds = presenceData.map(p => p.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, name, employee_role')
            .in('user_id', userIds);

          // Map profiles to presence data
          const onlineUsersWithProfiles = presenceData.map(presence => ({
            ...presence,
            profiles: profiles?.find(p => p.user_id === presence.user_id) || null
          }));

          setOnlineUsers(onlineUsersWithProfiles as any);
        } else {
          setOnlineUsers([]);
        }
      } catch (error) {
        console.error('Error loading online users:', error);
      }
    };

    loadOnlineUsers();

    // Subscribe to presence changes
    const presenceSubscription = supabase
      .channel('user_presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        async (payload) => {
          console.log('Presence change:', payload);
          await loadOnlineUsers(); // Reload all online users when any change occurs
        }
      )
      .subscribe();

    // Update presence every 30 seconds to keep user online
    const presenceInterval = setInterval(() => {
      supabase
        .from('user_presence')
        .update({
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    }, 30000);

    // Set offline on page close/reload
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        `${window.location.origin}/api/set-offline`,
        JSON.stringify({ user_id: user.id })
      );
    };

    // Set offline on visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(presenceInterval);
      setOffline();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      presenceSubscription.unsubscribe();
    };
  }, [user]);

  return {
    onlineUsers,
    totalOnline: onlineUsers.length
  };
};
