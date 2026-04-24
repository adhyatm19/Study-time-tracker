import Link from "next/link";

import { buttonStyles } from "@/components/shared/button";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AuthButton({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <Link
      href={isAuthenticated ? "/dashboard" : "/auth/login"}
      className={cn(buttonStyles({ variant: "primary", size: "sm" }), "whitespace-nowrap")}
    >
      {isAuthenticated ? `Open ${APP_NAME}` : "Sign in"}
    </Link>
  );
}
