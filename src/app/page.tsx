"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React, { Suspense, useState } from "react";
import { useUser } from "@/lib/user-context";
import Connect from "@/components/connect";
import BlurFadeIn from "@/components/blur-fade-in";
import { AnimatePresence } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { make_connect_uuid } from "@/lib/utils";
import { usePeer } from "@/lib/peer-context";
import StatusRender from "@/components/status-render";
import localforage from "localforage";

export default function Page() {
  const { status } = usePeer();
  if (status.type === "peer_connected") {
    return <StatusRender />;
  }

  return (
    <Suspense>
      <main className="min-h-screen flex items-center justify-center">
        <App />
      </main>
    </Suspense>
  );
}

function App() {
  const { dispatch, state } = useUser();

  const [error, setError] = useState<string>("");
  const search = useSearchParams();
  const router = useRouter();
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formdata = new FormData(e.currentTarget);
    const name = formdata.get("name");
    if (
      !name ||
      typeof name !== "string" ||
      name.trim() === "" ||
      name.length > 20
    ) {
      setError("Please enter your name max 20 char");
      return;
    }
    dispatch({
      type: "SET_USER",
      payload: { id: make_connect_uuid(name.toLocaleLowerCase()) },
    });
    if (search.has("auto") && state?.peerId) {
      router.push(`/${state}`);
    }
  };

  if (state?.checking) {
    return;
  }

  return (
    <AnimatePresence mode="wait">
      {!state?.id ? (
        <BlurFadeIn className="w-full max-w-md mx-auto">
          <h2 className="text-3xl text-center mb-4">Setup your profile</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              autoFocus
              type="text"
              placeholder="Your name"
              required
              name="name"
            />

            <Button type="submit" className="w-full">
              Save & Continue
            </Button>
          </form>
          {error && (
            <div className="my-4 p-3 text-sm bg-red-100 text-red-700 rounded border border-red-300 text-center">
              {error}
            </div>
          )}
        </BlurFadeIn>
      ) : (
        <>
          <BlurFadeIn className=" absolute top-3 right-3">
            <Button
              key={"reset"}
              variant={"link"}
              className="text-red-400"
              onClick={() => {
                localforage.removeItem("user");
                window.location.reload();
              }}
            >
              Reset
            </Button>
          </BlurFadeIn>
          <Connect />
        </>
      )}
    </AnimatePresence>
  );
}
