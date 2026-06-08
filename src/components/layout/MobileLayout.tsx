import React from 'react';
import { Menu, Search, Plus, Home, Users, Calendar, FileText, CheckSquare, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface MobileLayoutProps {
    children: React.ReactNode;
    headerTitle?: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
    drawerContent?: React.ReactNode;
    user?: {
        displayName?: string;
        email?: string;
        photoURL?: string;
    } | null;
    onFabClick?: () => void;
    rightHeaderAction?: React.ReactNode;
}

export const MobileLayout = ({
    children,
    headerTitle = "Zync",
    activeTab,
    onTabChange,
    drawerContent,
    user,
    onFabClick,
    rightHeaderAction
}: MobileLayoutProps) => {
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const navigate = useNavigate();

    const leftItems = [
        { id: 'Home', icon: Home, label: 'Home' },
        { id: 'People', icon: Users, label: 'People' },
        { id: 'Calendar', icon: Calendar, label: 'Cal' },
    ];

    const rightItems = [
        { id: 'Notes', icon: FileText, label: 'Notes' },
        { id: 'Tasks', icon: CheckSquare, label: 'Tasks' },
        { id: 'Meet', icon: Video, label: 'Meet' },
    ];

    const handleFabClick = () => {
        if (onFabClick) {
            onFabClick();
        } else {
            navigate('/new-project');
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
            {}
            <header className="h-14 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 shrink-0 z-40">
                <div className="flex items-center gap-3">
                    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="-ml-2 h-10 w-10">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Open Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0">
                            <SheetHeader className="sr-only">
                                <SheetTitle>Navigation Menu</SheetTitle>
                                <SheetDescription>
                                    Open app navigation links and user account shortcuts.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="flex flex-col h-full bg-background">
                                {user && (
                                    <div className="p-6 border-b flex items-center gap-4 bg-muted/20">
                                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                                            <AvatarImage src={user.photoURL} />
                                            <AvatarFallback>{user.displayName?.substring(0, 1) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-semibold truncate text-lg">{user.displayName}</span>
                                            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                                        </div>
                                    </div>
                                )}
                                <div
                                    className="flex-1 overflow-y-auto"
                                    onClick={(event) => {
                                        const target = event.target as HTMLElement;
                                        if (target.closest("button, a, [data-close-drawer='true']")) {
                                            setIsDrawerOpen(false);
                                        }
                                    }}
                                >
                                    {drawerContent}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <div className="font-semibold text-lg tracking-tight">
                        {headerTitle}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {rightHeaderAction ? rightHeaderAction : (
                        <Button variant="ghost" size="icon" className="-mr-2 text-muted-foreground">
                            <Search className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </header>

            {}
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background relative" id="mobile-main-content">
                {children}
            </main>

            {}
            {}
            <nav className="h-16 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 z-40 pb-safe px-3">
                <div className="flex items-center justify-between h-full max-w-lg mx-auto relative">
                    {leftItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 py-1 transition-colors relative group",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all duration-200",
                                    isActive ? "bg-primary/10" : "group-hover:bg-muted"
                                )}>
                                    <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                                </div>
                                <span className="text-[9px] font-medium mt-0.5">{item.label}</span>
                            </button>
                        );
                    })}

                    {/* Middle FAB */}
                    <div className="relative -top-4 px-2 shrink-0 z-50">
                        <button
                            onClick={handleFabClick}
                            className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center ring-4 ring-background hover:bg-primary/95 transition-transform active:scale-95"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>

                    {rightItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 py-1 transition-colors relative group",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all duration-200",
                                    isActive ? "bg-primary/10" : "group-hover:bg-muted"
                                )}>
                                    <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                                </div>
                                <span className="text-[9px] font-medium mt-0.5">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};
