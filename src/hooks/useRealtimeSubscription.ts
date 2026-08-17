import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionProps {
  table: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

// Callbacks são guardados em ref para não recriar o canal a cada render
// (deps de arrow function inline nunca são iguais entre renders, o que
// fazia o canal reinscrever continuamente e podia perder eventos).
export const useRealtimeSubscription = ({
  table,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeSubscriptionProps) => {
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete });
  callbacksRef.current = { onInsert, onUpdate, onDelete };

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table,
        },
        (payload) => {
          console.log(`[Realtime] INSERT em ${table}:`, payload);
          callbacksRef.current.onInsert?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table,
        },
        (payload) => {
          console.log(`[Realtime] UPDATE em ${table}:`, payload);
          callbacksRef.current.onUpdate?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: table,
        },
        (payload) => {
          console.log(`[Realtime] DELETE em ${table}:`, payload);
          callbacksRef.current.onDelete?.(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);
};
