"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CommunicationRealtimeSyncProps = {
  role: "planner" | "vendor";
  plannerUserId?: string;
  vendorId?: string | null;
};

export function CommunicationRealtimeSync({
  role,
  plannerUserId,
  vendorId,
}: CommunicationRealtimeSyncProps) {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isClosed = false;

    const refreshSafely = () => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 1200) {
        return;
      }
      lastRefreshAtRef.current = now;
      router.refresh();
    };

    try {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase.channel(`comm-sync-${role}-${plannerUserId ?? vendorId ?? "anon"}`);

      if (role === "planner" && plannerUserId) {
        channel.on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "inquiries",
          filter: `planner_user_id=eq.${plannerUserId}`,
        }, refreshSafely);
      }

      if (role === "vendor" && vendorId) {
        channel.on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "inquiries",
          filter: `vendor_profile_id=eq.${vendorId}`,
        }, refreshSafely);
      }

      channel.on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "inquiry_messages",
      }, refreshSafely);

      channel.subscribe();

      intervalId = setInterval(() => {
        if (!isClosed) {
          refreshSafely();
        }
      }, 30000);

      return () => {
        isClosed = true;
        if (intervalId) {
          clearInterval(intervalId);
        }
        supabase.removeChannel(channel);
      };
    } catch {
      intervalId = setInterval(() => {
        if (!isClosed) {
          refreshSafely();
        }
      }, 45000);

      return () => {
        isClosed = true;
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
  }, [plannerUserId, role, router, vendorId]);

  return null;
}
