import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionProps {
  table: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export const useRealtimeSubscription = ({
  table,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeSubscriptionProps) => {
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
          onInsert?.(payload);
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
          onUpdate?.(payload);
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
          onDelete?.(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onInsert, onUpdate, onDelete]);
};
