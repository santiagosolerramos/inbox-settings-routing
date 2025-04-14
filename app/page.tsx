"use client";

import { useState } from "react";
import InboxMockup from "@/components/inbox-mockup";
import InboxSettings from "@/components/inbox-settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  const [activeView, setActiveView] = useState<"inbox" | "settings">("inbox");

  return (
    <div className="flex h-screen bg-background">
      <div className="w-56 border-r p-4 flex flex-col space-y-2 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-4">Navigation</h2>
        <Button
          variant={activeView === 'inbox' ? 'secondary' : 'ghost'}
          onClick={() => setActiveView("inbox")}
          className="justify-start w-full"
        >
          Inbox Mockup
        </Button>
        <Button
          variant={activeView === 'settings' ? 'secondary' : 'ghost'}
          onClick={() => setActiveView("settings")}
          className="justify-start w-full"
        >
          Settings
        </Button>
      </div>

      <main className="flex-1 overflow-auto p-4">
        {activeView === "inbox" && (
          <InboxMockup />
        )}
        {activeView === "settings" && (
          <div className="max-w-4xl mx-auto">
            <InboxSettings />
          </div>
        )}
      </main>
    </div>
  );
}

