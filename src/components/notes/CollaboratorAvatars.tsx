import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getFullUrl } from '@/lib/utils';
import { ActiveUser } from '@/hooks/useNotePresence';

interface CollaboratorAvatarsProps {
  activeUsers: ActiveUser[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: { avatar: 'w-6 h-6', text: 'text-[9px]', dot: 'w-2 h-2', spacing: '-space-x-1.5' },
  md: { avatar: 'w-7 h-7', text: 'text-[10px]', dot: 'w-2.5 h-2.5', spacing: '-space-x-2' },
  lg: { avatar: 'w-8 h-8', text: 'text-xs', dot: 'w-3 h-3', spacing: '-space-x-2.5' },
};

export const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  activeUsers,
  maxVisible = 5,
  size = 'md',
  className = '',
}) => {
  if (!activeUsers || activeUsers.length === 0) {
    return null;
  }

  const visibleUsers = activeUsers.slice(0, maxVisible);
  const remainingCount = activeUsers.length - maxVisible;
  const styles = sizeClasses[size];

  return (
    <TooltipProvider delayDuration={100}>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Stacked Avatars */}
        <div className={`flex ${styles.spacing}`}>
          {visibleUsers.map((user, index) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div
                  className="relative cursor-default transition-all duration-200 hover:scale-110 hover:z-20"
                  style={{ zIndex: visibleUsers.length - index }}
                >
                  <Avatar
                    className={`${styles.avatar} border-2 border-background shadow-sm transition-shadow duration-200`}
                    style={{ boxShadow: `0 0 0 2px ${user.color}` }}
                  >
                    <AvatarImage
                      src={getFullUrl(user.avatarUrl)}
                      alt={user.name}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback
                      className={`${styles.text} font-semibold text-white`}
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Active pulse indicator */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 ${styles.dot} rounded-full border-2 border-background animate-pulse`}
                    style={{ backgroundColor: user.color }}
                  />
                </div>
              </TooltipTrigger>
              
              <TooltipContent
                side="bottom"
                sideOffset={8}
                className="px-3 py-1.5 text-xs font-medium border-0 shadow-lg"
                style={{ backgroundColor: user.color, color: 'white' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{user.name}</span>
                  <span className="opacity-80">is editing</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {/* Overflow indicator */}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`${styles.avatar} rounded-full border-2 border-background bg-muted flex items-center justify-center cursor-default`}
                  style={{ zIndex: 0 }}
                >
                  <span className={`${styles.text} font-semibold text-muted-foreground`}>
                    +{remainingCount}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                <div className="text-xs">
                  {activeUsers.slice(maxVisible).map(u => u.name).join(', ')}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Text label */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {activeUsers.length === 1 
            ? '1 person editing' 
            : `${activeUsers.length} people editing`
          }
        </span>
      </div>
    </TooltipProvider>
  );
};

export default CollaboratorAvatars;
