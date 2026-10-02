import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/types/domain";

const SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-14 text-base",
} as const;

interface UserAvatarProps {
  user: Pick<UserSummary, "name" | "avatarUrl"> | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  return (
    <Avatar className={cn(SIZES[size], className)}>
      {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-primary/10 font-medium text-primary">{initials(user?.name)}</AvatarFallback>
    </Avatar>
  );
}

export function AvatarStack({ users, max = 4, size = "sm" }: { users: UserSummary[]; max?: number; size?: keyof typeof SIZES }) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <div className="flex -space-x-1.5" aria-label={users.map((u) => u.name).join(", ")}>
      {shown.map((u) => (
        <UserAvatar key={u.id} user={u} size={size} className="ring-2 ring-background" />
      ))}
      {rest > 0 ? (
        <span className={cn("flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-background", SIZES[size])}>
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
