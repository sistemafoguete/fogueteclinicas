import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { EmployeeRole } from '@/hooks/useRolePermissions';

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  role?: EmployeeRole | string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showRoleBadge?: boolean;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

const roleColors: Record<string, string> = {
  director: 'bg-gradient-to-br from-amber-500 to-orange-600',
  coordinator_madre: 'bg-gradient-to-br from-blue-500 to-blue-600',
  coordinator_floresta: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  coordinator_atendimento_floresta: 'bg-gradient-to-br from-purple-500 to-purple-600',
  financeiro: 'bg-gradient-to-br from-teal-500 to-teal-600',
  receptionist: 'bg-gradient-to-br from-rose-400 to-rose-500',
  professional: 'bg-gradient-to-br from-sky-500 to-sky-600',
  therapist: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
  intern: 'bg-gradient-to-br from-slate-400 to-slate-500',
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const getRoleColor = (role: EmployeeRole | string | null | undefined): string => {
  if (!role) return 'bg-gradient-to-br from-primary to-primary/80';
  return roleColors[role as string] || 'bg-gradient-to-br from-primary to-primary/80';
};

export const UserAvatar = ({ 
  name, 
  avatarUrl, 
  role, 
  size = 'md', 
  className,
  showRoleBadge = false
}: UserAvatarProps) => {
  const initials = getInitials(name);
  const roleColor = getRoleColor(role);

  return (
    <div className="relative">
      <Avatar className={cn(
        sizeClasses[size],
        'ring-2 ring-background shadow-md transition-transform hover:scale-105',
        className
      )}>
        {avatarUrl ? (
          <AvatarImage 
            src={avatarUrl} 
            alt={name || 'Avatar'} 
            className="object-cover"
          />
        ) : null}
        <AvatarFallback className={cn(
          roleColor,
          'text-white font-semibold'
        )}>
          {initials}
        </AvatarFallback>
      </Avatar>
      {showRoleBadge && role === 'director' && (
        <span className="absolute -bottom-1 -right-1 h-4 w-4 bg-amber-500 rounded-full border-2 border-background flex items-center justify-center">
          <span className="text-[8px] text-white">⭐</span>
        </span>
      )}
    </div>
  );
};
