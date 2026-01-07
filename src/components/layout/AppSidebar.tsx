import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import logo from '@/assets/fundacao-dom-bosco-logo-optimized.png';
import { 
  Users, Calendar, DollarSign, UserPlus, Package, BarChart3, UserCheck, 
  Home, FolderOpen, LogOut, Settings, Archive, CheckSquare, Shield, Heart, 
  ClipboardList, MessageSquare, FileCheck, FileText, Folder, Clock, Bell, Brain, 
  LucideIcon, ChevronDown, ChevronRight, Stethoscope, CalendarDays, Wallet, 
  UsersRound, TrendingUp, MessageCircle, User, Tag, Sparkles
} from 'lucide-react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useCustomPermissions } from '@/hooks/useCustomPermissions';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Map icon names to actual icon components
const iconMapping: Record<string, LucideIcon> = {
  Home, UserPlus, Users, Calendar, ClipboardList, UserCheck, FolderOpen, 
  DollarSign, BarChart3, Package, Settings, Archive, CheckSquare, Shield, 
  Heart, MessageSquare, FileCheck, FileText, Folder, Clock, Bell, Brain, Tag
};

// Category icons, colors and gradients - visual design
const categoryConfig: Record<string, { icon: LucideIcon; gradient: string; iconBg: string; hoverBg: string }> = {
  'GESTÃO CLÍNICA': { 
    icon: Stethoscope, 
    gradient: 'from-emerald-500/20 to-teal-500/10',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    hoverBg: 'hover:bg-emerald-500/10'
  },
  'AGENDA': { 
    icon: CalendarDays, 
    gradient: 'from-blue-500/20 to-cyan-500/10',
    iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    hoverBg: 'hover:bg-blue-500/10'
  },
  'FINANCEIRO': { 
    icon: Wallet, 
    gradient: 'from-amber-500/20 to-orange-500/10',
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    hoverBg: 'hover:bg-amber-500/10'
  },
  'ESTOQUE': { 
    icon: Package, 
    gradient: 'from-purple-500/20 to-violet-500/10',
    iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    hoverBg: 'hover:bg-purple-500/10'
  },
  'EQUIPE': { 
    icon: UsersRound, 
    gradient: 'from-cyan-500/20 to-sky-500/10',
    iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    hoverBg: 'hover:bg-cyan-500/10'
  },
  'RELATÓRIOS': { 
    icon: TrendingUp, 
    gradient: 'from-rose-500/20 to-pink-500/10',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    hoverBg: 'hover:bg-rose-500/10'
  },
  'COMUNICAÇÃO': { 
    icon: MessageCircle, 
    gradient: 'from-indigo-500/20 to-purple-500/10',
    iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    hoverBg: 'hover:bg-indigo-500/10'
  },
  'PESSOAL': { 
    icon: User, 
    gradient: 'from-teal-500/20 to-emerald-500/10',
    iconBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    hoverBg: 'hover:bg-teal-500/10'
  },
};

// Dynamic menu items based on role permissions
const getMenuItemsForRole = (permissions: any, customPermissions: any) => {
  const items = [];

  // Painel - sempre visível
  items.push({
    id: 'dashboard',
    title: 'Painel',
    url: '/',
    icon: 'Home',
    category: null,
    order_index: 0
  });

  // 🏥 GESTÃO CLÍNICA
  if (permissions.canViewAllClients() || permissions.isProfessional() || customPermissions.hasPermission('view_clients')) {
    items.push({
      id: 'clients',
      title: 'Pacientes',
      url: '/clients',
      icon: 'Users',
      category: 'GESTÃO CLÍNICA',
      order_index: 1
    });
  }
  if (permissions.canViewMyPatients()) {
    items.push({
      id: 'my-patients',
      title: 'Meus Pacientes',
      url: '/my-patients',
      icon: 'Heart',
      category: 'GESTÃO CLÍNICA',
      order_index: 2
    });
  }
  if (permissions.isProfessional() || permissions.isCoordinator() || permissions.isDirector()) {
    items.push({
      id: 'medical-records',
      title: 'Prontuários',
      url: '/medical-records',
      icon: 'FileText',
      category: 'GESTÃO CLÍNICA',
      order_index: 3
    });
  }
  if (permissions.isDirector() || permissions.isCoordinator()) {
    items.push({
      id: 'attendance-validation',
      title: 'Validar Atendimentos',
      url: '/attendance-validation',
      icon: 'CheckSquare',
      category: 'GESTÃO CLÍNICA',
      order_index: 4
    });
  }
  items.push({
    id: 'feedback-control',
    title: 'Controle de Devolutiva',
    url: '/feedback-control',
    icon: 'FileCheck',
    category: 'GESTÃO CLÍNICA',
    order_index: 5
  });

  // Neuroavaliação - apenas diretores
  if (permissions.isDirector()) {
    items.push({
      id: 'neuroassessment',
      title: 'Neuroavaliação',
      url: '/neuroassessment',
      icon: 'Brain',
      category: 'GESTÃO CLÍNICA',
      order_index: 5.5
    });
  }

  // 📅 AGENDA
  if (permissions.canViewAllSchedules() || permissions.isProfessional() || customPermissions.hasPermission('view_schedules')) {
    items.push({
      id: 'schedule',
      title: 'Agenda',
      url: '/schedule',
      icon: 'Calendar',
      category: 'AGENDA',
      order_index: 6
    });
  }
  if (permissions.isDirector() || permissions.isCoordinator()) {
    items.push({
      id: 'schedule-control',
      title: 'Controle de Agendamentos',
      url: '/schedule-control',
      icon: 'ClipboardList',
      category: 'AGENDA',
      order_index: 7
    });
    items.push({
      id: 'meeting-alerts',
      title: 'Alertas de Reunião',
      url: '/meeting-alerts',
      icon: 'Bell',
      category: 'AGENDA',
      order_index: 8
    });
  }

  // 💰 FINANCEIRO - Apenas diretores
  if (permissions.isDirector() || customPermissions.hasPermission('view_financial')) {
    items.push({
      id: 'financial',
      title: 'Financeiro',
      url: '/financial',
      icon: 'DollarSign',
      category: 'FINANCEIRO',
      order_index: 9
    });
  }
  if (permissions.userRole === 'director' || permissions.userRole === 'coordinator_floresta' || customPermissions.hasPermission('view_contracts')) {
    items.push({
      id: 'contracts',
      title: 'Contratos - Floresta',
      url: '/contracts',
      icon: 'FolderOpen',
      category: 'FINANCEIRO',
      order_index: 10
    });
  }

  // Templates de Contrato - apenas diretores
  if (permissions.isDirector()) {
    items.push({
      id: 'contract-templates',
      title: 'Templates de Contrato',
      url: '/contract-templates',
      icon: 'FileText',
      category: 'FINANCEIRO',
      order_index: 10.5
    });
  }

  // 📦 ESTOQUE
  if (permissions.canManageStock() || customPermissions.hasPermission('view_stock')) {
    items.push({
      id: 'stock',
      title: 'Estoque',
      url: '/stock',
      icon: 'Package',
      category: 'ESTOQUE',
      order_index: 11
    });
  }

  // 👥 EQUIPE
  if (permissions.canManageEmployees() || customPermissions.hasPermission('view_employees')) {
    items.push({
      id: 'employees',
      title: 'Funcionários',
      url: '/employees-new',
      icon: 'UserPlus',
      category: 'EQUIPE',
      order_index: 12
    });
  }
  if (permissions.isDirector()) {
    items.push({
      id: 'employee-control',
      title: 'Controle de Funcionários',
      url: '/employee-control',
      icon: 'UserCheck',
      category: 'EQUIPE',
      order_index: 13
    });
    items.push({
      id: 'custom-roles',
      title: 'Cargos Personalizados',
      url: '/custom-roles',
      icon: 'Tag',
      category: 'EQUIPE',
      order_index: 13.5
    });
    items.push({
      id: 'anamnesis',
      title: 'Anamnese Digital',
      url: '/anamnesis',
      icon: 'ClipboardList',
      category: 'GESTÃO CLÍNICA',
      order_index: 5.6
    });
  }
  if (permissions.canManageUsers?.()) {
    items.push({
      id: 'users',
      title: 'Usuários',
      url: '/users',
      icon: 'Shield',
      category: 'EQUIPE',
      order_index: 14
    });
  }

  // 📊 RELATÓRIOS
  if (permissions.canViewReports() || customPermissions.hasPermission('view_reports')) {
    items.push({
      id: 'reports',
      title: 'Relatórios',
      url: '/reports',
      icon: 'BarChart3',
      category: 'RELATÓRIOS',
      order_index: 15
    });
  }

  // 💬 COMUNICAÇÃO
  items.push({
    id: 'messages',
    title: 'Mensagens',
    url: '/messages',
    icon: 'MessageSquare',
    category: 'COMUNICAÇÃO',
    order_index: 16
  });

  // 📁 PESSOAL
  items.push({
    id: 'my-files',
    title: 'Meus Arquivos',
    url: '/my-files',
    icon: 'Folder',
    category: 'PESSOAL',
    order_index: 17
  });
  items.push({
    id: 'timesheet',
    title: 'Ponto Eletrônico',
    url: '/timesheet',
    icon: 'Clock',
    category: 'PESSOAL',
    order_index: 18
  });
  return items.sort((a, b) => a.order_index - b.order_index);
};

interface MenuItem {
  id: string;
  title: string;
  url: string;
  icon: string;
  category: string | null;
  order_index: number;
}

// Memoized menu item component
const SidebarNavItem = memo(({ 
  item, 
  isActive, 
  collapsed, 
  categoryConfig: config
}: { 
  item: MenuItem; 
  isActive: boolean; 
  collapsed: boolean;
  categoryConfig?: typeof categoryConfig[string];
}) => {
  const IconComponent = iconMapping[item.icon];
  
  const content = (
    <NavLink 
      to={item.url} 
      className={cn(
        "sidebar-nav-item group relative flex items-center gap-3 px-3 py-2.5 rounded-xl",
        isActive 
          ? "sidebar-nav-active bg-primary text-primary-foreground" 
          : cn(
            "text-muted-foreground hover:text-foreground",
            config?.hoverBg || "hover:bg-muted/80"
          ),
        collapsed && "justify-center px-2"
      )}
    >
      {/* Icon */}
      <span className={cn(
        "flex items-center justify-center shrink-0 rounded-lg",
        collapsed ? "h-8 w-8" : "h-7 w-7",
        isActive 
          ? "bg-white/20" 
          : config?.iconBg || "bg-muted"
      )}>
        {IconComponent && <IconComponent className={cn(
          collapsed ? "h-4 w-4" : "h-3.5 w-3.5",
          isActive && "text-primary-foreground"
        )} />}
      </span>
      
      {!collapsed && (
        <>
          <span className="text-sm font-medium truncate">{item.title}</span>
          {isActive && (
            <span className="ml-auto h-2 w-2 rounded-full bg-primary-foreground" />
          )}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{content}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
});

SidebarNavItem.displayName = 'SidebarNavItem';

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useRolePermissions();
  const customPermissions = useCustomPermissions();
  const currentPath = location.pathname;
  const [navigationItems, setNavigationItems] = useState<MenuItem[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // Load navigation items based on permissions
  useEffect(() => {
    if (!permissions.loading && !customPermissions.loading) {
      const items = getMenuItemsForRole(permissions, customPermissions);
      setNavigationItems(items);
    }
  }, [permissions.loading, permissions.userRole, customPermissions.loading, customPermissions.permissions]);

  // Auto-expand category containing active route
  useEffect(() => {
    const activeItem = navigationItems.find(item => {
      if (item.url === '/') return currentPath === '/';
      return currentPath.startsWith(item.url);
    });
    if (activeItem?.category) {
      setOpenCategories(prev => ({ ...prev, [activeItem.category!]: true }));
    }
  }, [currentPath, navigationItems]);

  // Close sidebar on mobile after navigation
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile, setOpenMobile]);

  const toggleCategory = useCallback((category: string) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  }, []);

  const isActive = useCallback((path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  }, [currentPath]);

  // Group items by category - memoized
  const groupedItems = useMemo(() => {
    return navigationItems.reduce((acc, item) => {
      const category = item.category || 'main';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [navigationItems]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao fazer logout."
      });
    }
  };

  const categories = ['GESTÃO CLÍNICA', 'AGENDA', 'FINANCEIRO', 'ESTOQUE', 'EQUIPE', 'RELATÓRIOS', 'COMUNICAÇÃO', 'PESSOAL'];

  return (
    <Sidebar className={cn(
      "sidebar-container border-r border-sidebar-border/50",
      collapsed ? "w-[72px]" : "w-72"
    )}>
      <SidebarContent className="flex flex-col h-full bg-gradient-to-b from-sidebar-background via-sidebar-background to-sidebar-accent/30">
        {/* Logo Header with glassmorphism */}
        <div className={cn(
          "sidebar-header relative overflow-hidden border-b border-sidebar-border/30",
          collapsed ? "p-3" : "p-4"
        )}>
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 animate-gradient" />
          
          {!collapsed ? (
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-xl blur-sm" />
                <img 
                  alt="Fundação Dom Bosco" 
                  src="/lovable-uploads/1e0ba652-7476-47a6-b6a0-0f2c90e306bd.png" 
                  className="relative h-11 w-auto object-contain rounded-lg" 
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground/80 tracking-wide">Sistema Clínico</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Fundação Dom Bosco
                </span>
              </div>
            </div>
          ) : (
            <div className="relative flex justify-center">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl blur-sm" />
              <img 
                src={logo} 
                alt="FDB" 
                className="relative h-9 w-9 object-contain rounded-lg" 
                loading="lazy"
              />
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-2 py-3">
          {/* Dashboard - Main item with special styling */}
          {groupedItems.main && (
            <div className="mb-4">
              <SidebarMenu>
                {groupedItems.main.map(item => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild>
                      <SidebarNavItem 
                        item={item} 
                        isActive={isActive(item.url)} 
                        collapsed={collapsed}
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          )}

          {/* Decorative separator */}
          {!collapsed && (
            <div className="relative mb-4 px-3">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
          )}

          {/* Categorized Menu Groups */}
          <div className="space-y-1.5">
            {categories.map(category => {
              if (!groupedItems[category] || groupedItems[category].length === 0) return null;
              
              const config = categoryConfig[category];
              const CategoryIcon = config?.icon;
              const isOpen = openCategories[category] ?? false;
              const hasActiveItem = groupedItems[category].some(item => isActive(item.url));

              if (collapsed) {
                // Collapsed: show only icons with tooltips
                return (
                  <div key={category} className="space-y-1 py-1">
                    {groupedItems[category].map(item => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton asChild>
                          <SidebarNavItem 
                            item={item} 
                            isActive={isActive(item.url)} 
                            collapsed={collapsed}
                            categoryConfig={config}
                          />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </div>
                );
              }

              return (
                <Collapsible 
                  key={category} 
                  open={isOpen} 
                  onOpenChange={() => toggleCategory(category)}
                  className="group/collapsible"
                >
                  <CollapsibleTrigger className={cn(
                    "sidebar-category-header flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300",
                    hasActiveItem 
                      ? cn("text-foreground bg-gradient-to-r", config?.gradient)
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}>
                    {/* Category icon with colored background */}
                    <span className={cn(
                      "flex items-center justify-center h-6 w-6 rounded-lg transition-all duration-300",
                      config?.iconBg
                    )}>
                      {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5" />}
                    </span>
                    
                    <span className="flex-1 text-left">{category}</span>
                    
                    {/* Animated chevron */}
                    <span className={cn(
                      "flex items-center justify-center h-5 w-5 rounded-md transition-all duration-300",
                      isOpen ? "bg-primary/10 rotate-0" : "bg-muted/50 -rotate-90"
                    )}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </span>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="sidebar-category-content overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
                    <div className="relative pl-3 mt-1.5 space-y-0.5">
                      {/* Vertical connecting line */}
                      <div className="absolute left-[1.125rem] top-0 bottom-2 w-px bg-gradient-to-b from-border via-border/50 to-transparent" />
                      
                      <SidebarMenu>
                        {groupedItems[category].map((item, idx) => (
                          <SidebarMenuItem key={item.id} className="relative">
                            {/* Horizontal connector */}
                            <div className="absolute left-0 top-1/2 w-2 h-px bg-border/50" />
                            
                            <SidebarMenuButton asChild>
                              <SidebarNavItem 
                                item={item} 
                                isActive={isActive(item.url)} 
                                collapsed={collapsed}
                                categoryConfig={config}
                              />
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
        
        {/* Footer Section with glassmorphism */}
        <div className="sidebar-footer mt-auto border-t border-sidebar-border/30 p-3 space-y-2 bg-gradient-to-t from-sidebar-accent/40 to-transparent backdrop-blur-sm">
          {/* User Avatar Section */}
          <UserAvatarFooter collapsed={collapsed} />
          
          <SidebarMenu>
            <SidebarMenuItem>
              <ThemeToggle collapsed={collapsed} />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button 
                  onClick={handleLogout} 
                  className={cn(
                    "sidebar-logout-btn group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-300",
                    "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted/50 group-hover:bg-destructive/20 transition-colors duration-300">
                    <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                  </span>
                  {!collapsed && <span className="text-sm font-medium">Sair</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

// Memoized user avatar footer component
const UserAvatarFooter = memo(({ collapsed }: { collapsed: boolean }) => {
  const { userName, userRole, avatarUrl } = useCurrentUser();
  
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center py-1">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-full blur-sm opacity-50" />
              <UserAvatar 
                name={userName}
                avatarUrl={avatarUrl}
                role={userRole}
                size="sm"
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{userName || 'Usuário'}</p>
          <p className="text-xs text-muted-foreground">{userRole}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <div className="sidebar-user-card relative overflow-hidden flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-muted/80 to-muted/40 border border-border/30">
      {/* Subtle glow effect */}
      <div className="absolute -inset-px bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 to-secondary/40 rounded-full blur-sm opacity-60" />
        <UserAvatar 
          name={userName}
          avatarUrl={avatarUrl}
          role={userRole}
          size="sm"
        />
      </div>
      <div className="relative flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-foreground">{userName || 'Usuário'}</p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {userRole || 'Carregando...'}
        </p>
      </div>
    </div>
  );
});

UserAvatarFooter.displayName = 'UserAvatarFooter';
