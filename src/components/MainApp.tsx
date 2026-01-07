import { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuditLog } from '@/hooks/useAuditLog';
import { LogOut, User, Camera } from 'lucide-react';
import { ROLE_LABELS } from '@/hooks/useRolePermissions';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PendingAttendancesNotification } from '@/components/PendingAttendancesNotification';
import { AppointmentNotifications } from '@/components/AppointmentNotifications';
import { GlobalSearch } from '@/components/GlobalSearch';
import { QuickHelpCenter } from '@/components/QuickHelpCenter';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { UserAvatar } from '@/components/UserAvatar';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { PageBreadcrumb } from '@/components/ui/page-breadcrumb';
import { PageTransition } from '@/components/ui/page-transition';

// Lazy load page components
const Clients = lazy(() => import('@/pages/Clients'));
const Schedule = lazy(() => import('@/pages/Schedule'));
const ScheduleControl = lazy(() => import('@/pages/ScheduleControl'));
const Financial = lazy(() => import('@/pages/Financial'));
const Contracts = lazy(() => import('@/pages/Contracts'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));
const StockManager = lazy(() => import('@/pages/StockManager'));
const Reports = lazy(() => import('@/pages/Reports'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const MyPatients = lazy(() => import('@/pages/MyPatients'));
const MedicalRecords = lazy(() => import('@/pages/MedicalRecords'));
const AttendanceValidation = lazy(() => import('@/pages/AttendanceValidation'));
const EmployeesNew = lazy(() => import('@/pages/EmployeesNew'));
const DirectMessages = lazy(() => import('@/pages/DirectMessages'));
const EmployeeControl = lazy(() => import('@/pages/EmployeeControl'));
const FeedbackControl = lazy(() => import('@/pages/FeedbackControl'));
const MyFiles = lazy(() => import('@/pages/MyFiles'));
const Timesheet = lazy(() => import('@/pages/Timesheet'));
const MeetingAlerts = lazy(() => import('@/pages/MeetingAlerts'));
const Neuroassessment = lazy(() => import('@/pages/Neuroassessment'));
const ContractTemplates = lazy(() => import('@/pages/ContractTemplates'));
const CustomRoles = lazy(() => import('@/pages/CustomRoles'));
const Anamnesis = lazy(() => import('@/pages/Anamnesis'));

export const MainApp = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  
  // Usar hook centralizado com cache
  const { profile, userName, userRole, avatarUrl } = useCurrentUser();

  const handleLogout = async () => {
    try {
      await logAction({
        entityType: 'auth',
        action: 'logout_attempted',
        metadata: { user_email: user?.email }
      });

      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao sair",
          description: error.message,
        });
      } else {
        await logAction({
          entityType: 'auth',
          action: 'logout_success',
          metadata: { user_email: user?.email }
        });
        
        toast({
          title: "Logout realizado com sucesso",
          description: "Até logo!",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
      });
    }
  };

  return (
    <Router>
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen w-full flex">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            {/* Header with hamburger menu */}
            <header className="bg-card border-b border-border p-3 sm:p-4 sticky top-0 z-40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4">
                  <SidebarTrigger className="flex items-center justify-center h-8 w-8 rounded-md border hover:bg-accent" />
                  <h1 className="text-base sm:text-xl font-bold text-primary hidden sm:block">FUNDAÇÃO DOM BOSCO</h1>
                  <h1 className="text-sm font-bold text-primary sm:hidden">FDB</h1>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4">
                  <QuickHelpCenter />
                  <GlobalSearch />
                  <NotificationBell />
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10 p-0 overflow-hidden">
                        <UserAvatar 
                          name={userName}
                          avatarUrl={avatarUrl}
                          role={userRole}
                          size="sm"
                          className="h-9 w-9 sm:h-10 sm:w-10"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 bg-background z-50 p-2">
                      <DropdownMenuLabel className="pb-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar 
                            name={userName}
                            avatarUrl={avatarUrl}
                            role={userRole}
                            size="md"
                          />
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-semibold leading-none">
                              {userName}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {userRole ? ROLE_LABELS[userRole] : 'Carregando...'}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={() => setProfileDialogOpen(true)} 
                        className="cursor-pointer px-2 py-2"
                      >
                        <Camera className="mr-3 h-4 w-4" />
                        <span>Meu Perfil</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <div className="px-2 py-1">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Notificações</p>
                      </div>
                      
                      <AppointmentNotifications />
                      <PendingAttendancesNotification />
                      
                      <DropdownMenuSeparator />
                      
                      <div className="px-2 py-1">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Configurações</p>
                      </div>
                      
                      <div className="px-2" onClick={(e) => e.stopPropagation()}>
                        <ThemeToggle />
                      </div>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link to="/messages" className="flex items-center px-2 py-2">
                          <MessageSquare className="mr-3 h-4 w-4" />
                          <span>Mensagens</span>
                        </Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer mt-1 px-2 py-2">
                        <LogOut className="mr-3 h-4 w-4" />
                        <span>Sair</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <UserProfileDialog 
                    open={profileDialogOpen} 
                    onOpenChange={setProfileDialogOpen} 
                  />
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-6">
              <PageBreadcrumb />
              <Suspense fallback={<PageSkeleton />}>
                <div className="animate-page-enter">
                  <Routes>
                    <Route path="/" element={
                      <ProtectedRoute requiredPermission="view_dashboard">
                        <Dashboard />
                      </ProtectedRoute>
                    } />
                  
                    <Route path="/clients" element={
                      <ProtectedRoute requiredPermission="view_clients">
                        <Clients />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/schedule" element={
                      <ProtectedRoute requiredPermission="view_schedules">
                        <Schedule />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/schedule-control" element={
                      <ProtectedRoute allowedRoles={['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta']}>
                        <ScheduleControl />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/attendance-validation" element={
                      <ProtectedRoute allowedRoles={['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta']}>
                        <AttendanceValidation />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/feedback-control" element={
                      <ProtectedRoute allowedRoles={['director', 'coordinator_floresta', 'coordinator_atendimento_floresta']}>
                        <FeedbackControl />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/financial" element={
                      <ProtectedRoute requiredPermission="view_financial">
                        <Financial />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/contracts" element={
                      <ProtectedRoute requiredPermission="view_contracts">
                        <Contracts />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/stock" element={
                      <ProtectedRoute requiredPermission="view_stock">
                        <StockManager />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/reports" element={
                      <ProtectedRoute requiredPermission="view_reports">
                        <Reports />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/my-patients" element={
                      <MyPatients />
                    } />
                    
                    <Route path="/medical-records" element={
                      <ProtectedRoute requiredPermission="view_medical_records">
                        <MedicalRecords />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/employees-new" element={
                      <ProtectedRoute requiredPermission="view_employees">
                        <EmployeesNew />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/employee-control" element={
                      <ProtectedRoute allowedRoles={['director']}>
                        <EmployeeControl />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/users" element={
                      <ProtectedRoute requiredPermission="manage_users" allowedRoles={['director']}>
                        <UserManagement />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/messages" element={
                      <DirectMessages />
                    } />
                    
                    <Route path="/my-files" element={
                      <ProtectedRoute requiredPermission="view_files">
                        <MyFiles />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/timesheet" element={
                      <ProtectedRoute requiredPermission="view_timesheet">
                        <Timesheet />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/meeting-alerts" element={
                      <ProtectedRoute allowedRoles={['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta']}>
                        <MeetingAlerts />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/neuroassessment" element={
                      <ProtectedRoute allowedRoles={['director']}>
                        <Neuroassessment />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/contract-templates" element={
                      <ProtectedRoute allowedRoles={['director']}>
                        <ContractTemplates />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/custom-roles" element={
                      <ProtectedRoute allowedRoles={['director']}>
                        <CustomRoles />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/anamnesis" element={
                      <ProtectedRoute allowedRoles={['director']}>
                        <Anamnesis />
                      </ProtectedRoute>
                    } />
                      
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </Suspense>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </Router>
  );
};
