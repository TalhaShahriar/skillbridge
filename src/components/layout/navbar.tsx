import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser, getNavLinksForRole } from "@/server/auth";
import { UserMenu } from "@/components/layout/user-menu";

export async function Navbar() {
  const user = await getCurrentUser();
  const links = getNavLinksForRole(user?.role ?? null);

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            SkillBridge
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground"
          >
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center">
          {user ? (
            <UserMenu
              name={user.name}
              email={user.email}
              avatarUrl={user.avatarUrl}
            />
          ) : (
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
