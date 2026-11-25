import Link from "next/link";
import { Bot } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function AskAssistantFab() {
  return (
    <Link
      href="/assistant"
      className={buttonVariants({
        size: "sm",
        className:
          "fixed right-5 bottom-5 z-40 rounded-full shadow-lg",
      })}
    >
      <Bot className="size-4" />
      Ask SkillBridge
    </Link>
  );
}
