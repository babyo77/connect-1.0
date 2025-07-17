"use client";

import { use, useEffect } from "react";

import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import StatusRender from "@/components/status-render";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { state, dispatch } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (state?.checking) return;
    if (!state?.id) {
      router.push("/?auto=true");
      dispatch({ type: "SET_USER", payload: { peerId: id } });
    }
  }, [state?.checking, state?.id, dispatch, id, router]);

  return <StatusRender />;
}
