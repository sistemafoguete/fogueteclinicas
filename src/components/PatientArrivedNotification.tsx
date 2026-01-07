import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export default function PatientArrivedNotification() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Set up realtime listener for patient arrivals
    const channel = supabase
      .channel('patient-arrivals')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schedules',
          filter: `employee_id=eq.${user.id}`
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Check if patient_arrived changed from false to true
          if (!oldRecord?.patient_arrived && newRecord?.patient_arrived) {            
            toast({
              title: "🔔 Paciente Chegou!",
              description: `Seu próximo paciente chegou e está aguardando.`,
              duration: 10000,
            });

            // Play notification sound
            playNotificationSound();
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  const playNotificationSound = () => {
    try {
      // Create multiple beeps for better attention
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (frequency: number, delay: number) => {
        setTimeout(() => {
          const gainNode = audioContext.createGain();
          const oscillator = audioContext.createOscillator();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = frequency;
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
        }, delay);
      };

      // Play a sequence of beeps (like a notification bell)
      playBeep(800, 0);
      playBeep(600, 200);
      playBeep(800, 400);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  return null; // This component only handles notifications, no UI
}