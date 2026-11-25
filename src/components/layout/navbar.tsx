import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser, getNavLinksForRole } from "@/server/auth";
import { UserMenu } from "@/components/layout/user-menu";

export async function Navbar() {
  const user = await getCurrentUser();
  const links = getNavLinksForRole(user?.role ?? null);

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            SkillBridge
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground"
          >
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
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
