import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Edit, 
  FileText, 
  Plus, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  User,
  Activity,
  Upload,
  ArrowLeft,
  Download,
  Eye,
  UserX,
  RotateCcw,
  AlertTriangle,
  UserPlus,
  Minus,
  Clock,
  CreditCard,
  FolderOpen,
  Stethoscope,
  Heart,
  Brain,
  ClipboardCheck,
  FileCheck2,
  AlertCircle,
  Pill
} from 'lucide-react';
import { ContractGenerator } from './ContractGenerator';
import ServiceHistory from './ServiceHistory';
import ClientPaymentManager from './ClientPaymentManager';
import PrescriptionManager from './PrescriptionManager';

interface Client {
  id: string;
  name: string;
  cpf?: string;
  birth_date?: string;
  email?: string;
  phone?: string;
  responsible_name?: string;
  responsible_phone?: string;
  responsible_cpf?: string;
  unit?: string;
  address?: string;
  diagnosis?: string;
  medical_history?: string;
  neuropsych_complaint?: string;
  treatment_expectations?: string;
  clinical_observations?: string;
  is_active: boolean;
  created_at: string;
}

interface ClientNote {
  id: string;
  note_text: string;
  note_type: string;
  created_at: string;
  profiles?: { name: string };
}

interface ClientDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  uploaded_at: string;
  profiles?: { name: string };
}

interface AssignedProfessional {
  id: string;
  employee_id: string;
  is_active: boolean;
  profiles?: { name: string; employee_role: string };
  assigned_at: string;
}

interface Employee {
  user_id: string;
  name: string;
  employee_role: string;
}

interface ClientDetailsViewProps {
  client: Client;
  onEdit: () => void;
  onBack?: () => void;
  onRefresh?: () => void;
}

export default function ClientDetailsView({ client, onEdit, onBack, onRefresh }: ClientDetailsViewProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [assignedProfessionals, setAssignedProfessionals] = useState<AssignedProfessional[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [newNote, setNewNote] = useState('');
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [linkProfessionalDialogOpen, setLinkProfessionalDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(['']);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<any[]>([]);
  const { toast } = useToast();
  const [laudoInfo, setLaudoInfo] = useState<{ file_path: string; completed_at: string } | null>(null);
  const [loadingLaudo, setLoadingLaudo] = useState(false);
  const [nextAppointment, setNextAppointment] = useState<{ date: string; time: string } | null>(null);

  // Helper function to check if user is coordinator or director
  const isCoordinatorOrDirector = () => {
    return userProfile?.employee_role === 'director' || 
           userProfile?.employee_role === 'coordinator_madre' || 
           userProfile?.employee_role === 'coordinator_floresta' ||
           userProfile?.employee_role === 'coordinator_atendimento_floresta';
  };

  // Get unit color classes
  const getUnitColorClasses = () => {
    switch (client.unit) {
      case 'madre':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
          avatar: 'bg-blue-500 text-white'
        };
      case 'floresta':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-600 dark:text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          avatar: 'bg-emerald-500 text-white'
        };
      case 'atendimento_floresta':
        return {
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/30',
          text: 'text-purple-600 dark:text-purple-400',
          badge: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
          avatar: 'bg-purple-500 text-white'
        };
      default:
        return {
          bg: 'bg-muted',
          border: 'border-border',
          text: 'text-muted-foreground',
          badge: 'bg-muted text-muted-foreground border-border',
          avatar: 'bg-primary text-primary-foreground'
        };
    }
  };

  const unitColors = getUnitColorClasses();

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  useEffect(() => {
    loadClientData();
  }, [client.id]);

  const loadClientData = async () => {
    await Promise.all([
      loadNotes(),
      loadDocuments(), 
      loadAssignedProfessionals(),
      loadEmployees(),
      loadUserProfile(),
      loadAvailableEmployees(),
      loadCurrentAssignments(),
      loadLaudoInfo(),
      loadNextAppointment()
    ]);
  };

  const loadNextAppointment = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('schedules')
        .select('start_time')
        .eq('client_id', client.id)
        .gte('start_time', today)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const date = new Date(data.start_time);
        setNextAppointment({
          date: date.toLocaleDateString('pt-BR'),
          time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        setNextAppointment(null);
      }
    } catch (error) {
      console.error('Error loading next appointment:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('employee_role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadLaudoInfo = async () => {
    try {
      setLoadingLaudo(true);
      const { data, error } = await supabase
        .from('client_feedback_control')
        .select('laudo_file_path, completed_at')
        .eq('client_id', client.id)
        .not('laudo_file_path', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setLaudoInfo({
          file_path: data.laudo_file_path,
          completed_at: data.completed_at
        });
      } else {
        setLaudoInfo(null);
      }
    } catch (error) {
      console.error('Error loading laudo info:', error);
    } finally {
      setLoadingLaudo(false);
    }
  };

  const handleDownloadLaudo = async () => {
    if (!laudoInfo?.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('laudos')
        .download(laudoInfo.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laudo_${client.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: "Laudo baixado com sucesso!",
      });
    } catch (error: any) {
      console.error('Error downloading laudo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível baixar o laudo.",
      });
    }
  };

  const handleViewLaudo = async () => {
    if (!laudoInfo?.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('laudos')
        .createSignedUrl(laudoInfo.file_path, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Error viewing laudo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível visualizar o laudo.",
      });
    }
  };

  const loadNotes = async () => {
    try {
      const { data: notesData, error } = await supabase
        .from('client_notes')
        .select('id, note_text, note_type, created_at, created_by')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (notesData && notesData.length > 0) {
        const creatorIds = [...new Set(notesData.map(n => n.created_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', creatorIds);

        const notesWithProfiles = notesData.map(note => ({
          ...note,
          profiles: profiles?.find(p => p.user_id === note.created_by) || undefined
        }));

        setNotes(notesWithProfiles);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select(`
          id,
          document_name,
          document_type,
          file_path,
          uploaded_at,
          profiles:uploaded_by (name)
        `)
        .eq('client_id', client.id)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadAssignedProfessionals = async () => {
    try {
      const { data: assignments, error } = await supabase
        .from('client_assignments')
        .select('id, assigned_at, employee_id, is_active')
        .eq('client_id', client.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      if (assignments && assignments.length > 0) {
        const employeeIds = assignments.map(a => a.employee_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, employee_role')
          .in('user_id', employeeIds);

        if (profilesError) throw profilesError;

        const assignedWithProfiles = assignments.map(assignment => ({
          id: assignment.id,
          employee_id: assignment.employee_id,
          is_active: assignment.is_active,
          assigned_at: assignment.assigned_at,
          profiles: profiles?.find(p => p.user_id === assignment.employee_id) || { name: 'N/A', employee_role: 'N/A' }
        }));

        setAssignedProfessionals(assignedWithProfiles);
      } else {
        setAssignedProfessionals([]);
      }
    } catch (error) {
      console.error('Error loading assigned professionals:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_notes')
        .insert({
          client_id: client.id,
          note_text: newNote.trim(),
          created_by: user?.id,
          note_type: 'general'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Nota adicionada com sucesso!",
      });

      setNewNote('');
      setAddNoteDialogOpen(false);
      loadNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar a nota.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const handleScheduleAppointment = () => {
    const searchParams = new URLSearchParams();
    searchParams.set('client_id', client.id);
    searchParams.set('client_name', client.name);
    window.location.href = `/schedule?${searchParams.toString()}`;
  };

  const loadEmployees = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, name, employee_role')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEmployees(profiles || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleLinkProfessional = async () => {
    if (!selectedProfessional) return;

    setLoading(true);
    try {
      const { data: existing, error: checkError } = await supabase
        .from('client_assignments')
        .select('id, is_active')
        .eq('client_id', client.id)
        .eq('employee_id', selectedProfessional)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (!existing.is_active) {
          const { error: updateError } = await supabase
            .from('client_assignments')
            .update({ 
              is_active: true,
              assigned_by: user?.id 
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
        } else {
          toast({
            variant: "destructive",
            title: "Já vinculado",
            description: "Este profissional já está vinculado a este paciente.",
          });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('client_assignments')
          .insert({
            client_id: client.id,
            employee_id: selectedProfessional,
            assigned_by: user?.id
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Profissional vinculado com sucesso!",
      });

      setSelectedProfessional('');
      setLinkProfessionalDialogOpen(false);
      loadAssignedProfessionals();
    } catch (error) {
      console.error('Error linking professional:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível vincular o profissional.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProfessional = async (assignmentId: string) => {
    const confirmed = window.confirm('Tem certeza que deseja remover este profissional do cliente?');
    
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Profissional removido com sucesso!",
      });

      loadAssignedProfessionals();
    } catch (error) {
      console.error('Error removing professional:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o profissional.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateClient = async () => {
    const confirmed = window.confirm(
      `Tem certeza que deseja ${client.is_active ? 'desativar' : 'reativar'} o cliente "${client.name}"?`
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: !client.is_active })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Cliente ${client.is_active ? 'desativado' : 'reativado'} com sucesso!`,
      });

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating client status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status do cliente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignProfessional = async () => {
    const validEmployees = selectedEmployees.filter(emp => emp && emp.trim() !== '');
    
    if (validEmployees.length === 0) return;

    try {
      for (const employeeId of validEmployees) {
        const { data: existing, error: checkError } = await supabase
          .from('client_assignments')
          .select('id, is_active')
          .eq('client_id', client.id)
          .eq('employee_id', employeeId)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
          if (!existing.is_active) {
            const { error: updateError } = await supabase
              .from('client_assignments')
              .update({ 
                is_active: true,
                assigned_by: user?.id 
              })
              .eq('id', existing.id);

            if (updateError) throw updateError;
          }
        } else {
          const { error: insertError } = await supabase
            .from('client_assignments')
            .insert({
              client_id: client.id,
              employee_id: employeeId,
              assigned_by: user?.id
            });

          if (insertError) throw insertError;
        }
      }

      toast({
        title: "Sucesso",
        description: `${validEmployees.length} profissional(is) vinculado(s) com sucesso!`,
      });
      
      setIsAssignDialogOpen(false);
      setSelectedEmployees(['']);
      loadCurrentAssignments();
      loadAvailableEmployees();
      loadAssignedProfessionals();
    } catch (error) {
      console.error('Error assigning professionals:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível vincular os profissionais.",
      });
    }
  };

  const addEmployeeField = () => {
    setSelectedEmployees([...selectedEmployees, '']);
  };

  const removeEmployeeField = (index: number) => {
    if (selectedEmployees.length > 1) {
      const newEmployees = selectedEmployees.filter((_, i) => i !== index);
      setSelectedEmployees(newEmployees);
    }
  };

  const updateEmployeeSelection = (index: number, value: string) => {
    const newEmployees = [...selectedEmployees];
    newEmployees[index] = value;
    setSelectedEmployees(newEmployees);
  };

  const loadAvailableEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, employee_role')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAvailableEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadCurrentAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('client_assignments')
        .select(`
          id,
          employee_id,
          assigned_at,
          is_active,
          profiles!client_assignments_employee_id_fkey (
            name,
            employee_role
          )
        `)
        .eq('client_id', client.id)
        .eq('is_active', true);

      if (error) throw error;
      setCurrentAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('client_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Vinculação removida com sucesso!",
      });
      
      loadCurrentAssignments();
      loadAssignedProfessionals();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover a vinculação.",
      });
    }
  };

  const handleGenerateReport = () => {
    const reportContent = `
RELATÓRIO DO CLIENTE
====================

Nome: ${client.name}
ID: ${client.id}
CPF: ${client.cpf || 'Não informado'}
Data de Nascimento: ${client.birth_date ? formatDate(client.birth_date) : 'Não informado'}
Email: ${client.email || 'Não informado'}
Telefone: ${client.phone || 'Não informado'}

DADOS CLÍNICOS
==============

Diagnóstico: ${client.diagnosis || 'Nenhum'}
Histórico Médico: ${client.medical_history || 'Nenhum'}
Queixa Neuropsicológica: ${client.neuropsych_complaint || 'Nenhum'}
Expectativas do Tratamento: ${client.treatment_expectations || 'Não informado'}

OBSERVAÇÕES
===========

${client.clinical_observations || 'Nenhuma observação registrada'}

NOTAS REGISTRADAS
=================

${notes.map(note => `
Data: ${formatDateTime(note.created_at)}
Criado por: ${note.profiles?.name || 'Usuário'}
Nota: ${note.note_text}
`).join('\n')}

DOCUMENTOS ANEXADOS
==================

${documents.map(doc => `
- ${doc.document_name} (${doc.document_type || 'Documento'})
  Enviado em: ${formatDateTime(doc.uploaded_at)}
  Por: ${doc.profiles?.name || 'Usuário'}
`).join('\n')}

Relatório gerado em: ${new Date().toLocaleString('pt-BR')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-${client.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Relatório Gerado",
      description: "O relatório foi baixado com sucesso!",
    });
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const sanitizedName = selectedFile.name.replace(/[{}[\]<>]/g, '').replace(/\s+/g, '_');
      const fileName = `${Date.now()}_${sanitizedName}`;
      const filePath = `client-documents/${client.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: client.id,
          document_name: selectedFile.name,
          document_type: fileExt || 'document',
          file_path: filePath,
          file_size: selectedFile.size,
          uploaded_by: user?.id
        });

      if (dbError) throw dbError;

      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso!",
      });

      setSelectedFile(null);
      setUploadDialogOpen(false);
      loadDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Não foi possível enviar o documento: ${error.message || error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (doc: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('user-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.document_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download concluído",
        description: "O documento foi baixado com sucesso!",
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível baixar o documento.",
      });
    }
  };

  const handleViewDocument = async (doc: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(doc.file_path, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível visualizar o documento.",
      });
    }
  };

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'madre': return 'MADRE';
      case 'floresta': return 'Floresta';
      case 'atendimento_floresta': return 'Atendimento Floresta';
      default: return unit || 'Não informado';
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        {/* Hero Header */}
        <Card className={`${unitColors.bg} ${unitColors.border} border-2 overflow-hidden`}>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <Avatar className={`h-20 w-20 ${unitColors.avatar} text-2xl font-bold shadow-lg`}>
                <AvatarFallback className={unitColors.avatar}>
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>

              {/* Info Principal */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold">{client.name}</h1>
                  <Badge 
                    variant={client.is_active ? 'default' : 'secondary'}
                    className={client.is_active ? 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30' : ''}
                  >
                    {client.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                
                {/* Quick Info Badges */}
                <div className="flex flex-wrap gap-2 text-sm">
                  {client.cpf && (
                    <Badge variant="outline" className="font-normal">
                      <User className="h-3 w-3 mr-1" />
                      CPF: {client.cpf}
                    </Badge>
                  )}
                  {client.phone && (
                    <Badge variant="outline" className="font-normal">
                      <Phone className="h-3 w-3 mr-1" />
                      {client.phone}
                    </Badge>
                  )}
                  {client.unit && (
                    <Badge className={unitColors.badge}>
                      {getUnitLabel(client.unit)}
                    </Badge>
                  )}
                  {client.birth_date && (
                    <Badge variant="outline" className="font-normal">
                      <Calendar className="h-3 w-3 mr-1" />
                      {calculateAge(client.birth_date)} anos
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleScheduleAppointment}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Agendar novo atendimento</TooltipContent>
                </Tooltip>
                
                {isCoordinatorOrDirector() && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" onClick={onEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar dados do paciente</TooltipContent>
                  </Tooltip>
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={onBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Voltar para lista</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${unitColors.bg}`}>
                  <Clock className={`h-5 w-5 ${unitColors.text}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Próximo Agendamento</p>
                  {nextAppointment ? (
                    <p className="font-semibold text-sm">{nextAppointment.date} às {nextAppointment.time}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem agendamento</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${unitColors.bg}`}>
                  <Users className={`h-5 w-5 ${unitColors.text}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profissionais</p>
                  <p className="font-semibold text-sm">{assignedProfessionals.length} vinculado{assignedProfessionals.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${unitColors.bg}`}>
                  <FolderOpen className={`h-5 w-5 ${unitColors.text}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Documentos</p>
                  <p className="font-semibold text-sm">{documents.length} anexado{documents.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${unitColors.bg}`}>
                  <FileText className={`h-5 w-5 ${unitColors.text}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Laudo</p>
                  <p className="font-semibold text-sm">{laudoInfo ? 'Disponível' : 'Pendente'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Info Cards */}
          <div className="lg:col-span-4 space-y-4">
            {/* Personal Info Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className={`h-5 w-5 ${unitColors.text}`} />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {client.cpf && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CPF</span>
                    <span className="font-medium">{client.cpf}</span>
                  </div>
                )}
                {client.birth_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nascimento</span>
                    <span className="font-medium">{formatDate(client.birth_date)} ({calculateAge(client.birth_date)} anos)</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-right truncate max-w-[150px]">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone</span>
                    <span className="font-medium">{client.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cadastrado em</span>
                  <span className="font-medium">{formatDate(client.created_at)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Responsible Card */}
            {(client.responsible_name || client.responsible_phone || client.responsible_cpf) && (
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Heart className={`h-5 w-5 ${unitColors.text}`} />
                    Responsável
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {client.responsible_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome</span>
                      <span className="font-medium">{client.responsible_name}</span>
                    </div>
                  )}
                  {client.responsible_phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone</span>
                      <span className="font-medium">{client.responsible_phone}</span>
                    </div>
                  )}
                  {client.responsible_cpf && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF</span>
                      <span className="font-medium">{client.responsible_cpf}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Address Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className={`h-5 w-5 ${unitColors.text}`} />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{client.address || 'Não informado'}</p>
              </CardContent>
            </Card>

            {/* Professionals Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className={`h-5 w-5 ${unitColors.text}`} />
                    Profissionais
                  </CardTitle>
                  {isCoordinatorOrDirector() && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setIsAssignDialogOpen(true);
                        setSelectedEmployees(['']);
                        loadAvailableEmployees();
                        loadCurrentAssignments();
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {assignedProfessionals.length > 0 ? (
                  <div className="space-y-2">
                    {assignedProfessionals.slice(0, 3).map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{assignment.profiles?.name}</p>
                          <p className="text-xs text-muted-foreground">{assignment.profiles?.employee_role}</p>
                        </div>
                      </div>
                    ))}
                    {assignedProfessionals.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{assignedProfessionals.length - 3} mais
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum profissional vinculado</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-8">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <Tabs defaultValue="clinical" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-6">
                    <TabsTrigger value="clinical" className="text-xs md:text-sm">
                      <Stethoscope className="h-4 w-4 mr-1 hidden md:inline" />
                      Clínico
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-xs md:text-sm">
                      <Activity className="h-4 w-4 mr-1 hidden md:inline" />
                      Atendimentos
                    </TabsTrigger>
                    <TabsTrigger value="prescriptions" className="text-xs md:text-sm">
                      <Pill className="h-4 w-4 mr-1 hidden md:inline" />
                      Receita
                    </TabsTrigger>
                    <TabsTrigger value="financial" className="text-xs md:text-sm">
                      <CreditCard className="h-4 w-4 mr-1 hidden md:inline" />
                      Financeiro
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="text-xs md:text-sm">
                      <FolderOpen className="h-4 w-4 mr-1 hidden md:inline" />
                      Documentos
                    </TabsTrigger>
                  </TabsList>

                  {/* Clinical Tab */}
                  <TabsContent value="clinical" className="space-y-6">
                    {/* Diagnosis Highlight Card */}
                    <Card className={`border-2 ${client.diagnosis ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-emerald-500/10' : 'border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-amber-500/10'}`}>
                      <CardContent className="pt-5">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${client.diagnosis ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                            <Brain className={`h-6 w-6 ${client.diagnosis ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">Diagnóstico</h3>
                              {client.diagnosis ? (
                                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                  <ClipboardCheck className="h-3 w-3 mr-1" />
                                  Definido
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Pendente
                                </Badge>
                              )}
                            </div>
                            <p className={`text-base ${client.diagnosis ? '' : 'text-muted-foreground italic'}`}>
                              {client.diagnosis || 'Diagnóstico ainda não definido'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Laudo Section */}
                    <Card className={`border-2 ${laudoInfo ? 'border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-blue-500/10' : 'border-slate-500/20 bg-muted/30'}`}>
                      <CardContent className="pt-5">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${laudoInfo ? 'bg-blue-500/20' : 'bg-muted'}`}>
                            <FileCheck2 className={`h-6 w-6 ${laudoInfo ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">Laudo</h3>
                                {loadingLaudo ? (
                                  <Badge variant="outline" className="animate-pulse">Carregando...</Badge>
                                ) : laudoInfo ? (
                                  <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                    <FileCheck2 className="h-3 w-3 mr-1" />
                                    Disponível
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Pendente
                                  </Badge>
                                )}
                              </div>
                              
                              {laudoInfo && (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={handleViewLaudo}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    Visualizar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleDownloadLaudo}>
                                    <Download className="h-4 w-4 mr-1" />
                                    Baixar
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            {laudoInfo ? (
                              <p className="text-sm text-muted-foreground">
                                Concluído em: {new Date(laudoInfo.completed_at).toLocaleDateString('pt-BR')}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                O laudo será disponibilizado após a conclusão do processo de devolutiva
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Clinical Info Cards */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Histórico Médico */}
                      <Card className="border hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <div className="p-1.5 rounded-lg bg-rose-500/10">
                              <Heart className="h-4 w-4 text-rose-500" />
                            </div>
                            Histórico Médico
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className={`text-sm ${client.medical_history ? '' : 'text-muted-foreground italic'}`}>
                            {client.medical_history || 'Nenhum histórico registrado'}
                          </p>
                        </CardContent>
                      </Card>
                      
                      {/* Queixa Neuropsicológica */}
                      <Card className="border hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <div className="p-1.5 rounded-lg bg-purple-500/10">
                              <Brain className="h-4 w-4 text-purple-500" />
                            </div>
                            Queixa Principal
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className={`text-sm ${client.neuropsych_complaint ? '' : 'text-muted-foreground italic'}`}>
                            {client.neuropsych_complaint || 'Nenhuma queixa registrada'}
                          </p>
                        </CardContent>
                      </Card>
                      
                      {/* Expectativas do Tratamento */}
                      <Card className="border hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <div className="p-1.5 rounded-lg bg-sky-500/10">
                              <Activity className="h-4 w-4 text-sky-500" />
                            </div>
                            Expectativas do Tratamento
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className={`text-sm ${client.treatment_expectations ? '' : 'text-muted-foreground italic'}`}>
                            {client.treatment_expectations || 'Nenhuma expectativa registrada'}
                          </p>
                        </CardContent>
                      </Card>
                      
                      {/* Observações Clínicas */}
                      <Card className="border hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <div className="p-1.5 rounded-lg bg-amber-500/10">
                              <Stethoscope className="h-4 w-4 text-amber-500" />
                            </div>
                            Observações Clínicas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className={`text-sm whitespace-pre-wrap ${client.clinical_observations ? '' : 'text-muted-foreground italic'}`}>
                            {client.clinical_observations || 'Nenhuma observação registrada'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Notes Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Evolução do Atendimento
                        </h4>
                        <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Nova Nota
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adicionar Nova Nota</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label htmlFor="newNote">Nota</Label>
                                <Textarea
                                  id="newNote"
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                                  placeholder="Digite sua nota aqui..."
                                  rows={5}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setAddNoteDialogOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleAddNote} disabled={loading || !newNote.trim()}>
                                  {loading ? 'Salvando...' : 'Salvar'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      {notes.length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {notes.map((note) => (
                            <div key={note.id} className={`border-l-4 ${unitColors.border} pl-4 py-3 bg-muted/30 rounded-r-lg`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{note.profiles?.name || 'Usuário'}</span>
                                <span className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-8">Nenhuma nota registrada.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history">
                    <ServiceHistory clientId={client.id} />
                  </TabsContent>

                  {/* Prescriptions Tab */}
                  <TabsContent value="prescriptions">
                    <PrescriptionManager client={client} />
                  </TabsContent>

                  {/* Financial Tab */}
                  <TabsContent value="financial" className="space-y-6">
                    <ClientPaymentManager 
                      clientId={client.id} 
                      clientName={client.name}
                      userProfile={userProfile}
                    />
                    
                    <div className="border-t pt-6">
                      <h4 className="font-medium mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Contratos
                      </h4>
                      <ContractGenerator client={client} />
                    </div>
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="space-y-6">
                    {/* Upload Button */}
                    <div className="flex justify-end">
                      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Upload className="h-4 w-4 mr-2" />
                            Anexar Documento
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Anexar Documento</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="file">Arquivo</Label>
                              <Input
                                id="file"
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              />
                              <p className="text-sm text-muted-foreground">
                                Formatos aceitos: PDF, DOC, DOCX, JPG, PNG
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleFileUpload} disabled={loading || !selectedFile}>
                              {loading ? 'Enviando...' : 'Enviar'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Documents List */}
                    {documents.length > 0 ? (
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{doc.document_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.profiles?.name || 'Usuário'} • {formatDateTime(doc.uploaded_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{doc.document_type}</Badge>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" onClick={() => handleViewDocument(doc)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Visualizar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" onClick={() => handleDownloadDocument(doc)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Baixar</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">Nenhum documento anexado.</p>
                    )}

                    {/* Laudo Section */}
                    <div className="border-t pt-6">
                      <h4 className="font-medium mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Laudo
                      </h4>
                      
                      {loadingLaudo ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : laudoInfo ? (
                        <div className={`flex items-center justify-between p-4 rounded-lg ${unitColors.bg} border ${unitColors.border}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${unitColors.avatar}`}>
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Laudo Disponível</p>
                              <p className="text-xs text-muted-foreground">
                                Finalizado em {new Date(laudoInfo.completed_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={handleViewLaudo}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <Button size="sm" onClick={handleDownloadLaudo}>
                              <Download className="h-4 w-4 mr-1" />
                              Baixar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">Nenhum laudo anexado</p>
                          <p className="text-xs text-muted-foreground">O laudo é anexado através do controle de devolutiva</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Bar */}
        {isCoordinatorOrDirector() && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <Button variant="outline" size="sm" onClick={handleGenerateReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </Button>
                
                {client.is_active ? (
                  <Button variant="destructive" size="sm" onClick={handleDeactivateClient}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Desativar
                  </Button>
                ) : (
                  <Button variant="default" size="sm" onClick={handleDeactivateClient}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reativar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog para Vincular Profissional */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vincular Profissional ao Cliente</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {currentAssignments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Profissionais Vinculados:</h4>
                  <div className="space-y-2">
                    {currentAssignments.map((assignment: any) => (
                      <div key={assignment.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <span className="text-sm">{assignment.profiles?.name} - {assignment.profiles?.employee_role}</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRemoveAssignment(assignment.id)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Selecionar Profissionais:</Label>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={addEmployeeField}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                
                {selectedEmployees.map((selectedEmployee, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select 
                      value={selectedEmployee} 
                      onValueChange={(value) => updateEmployeeSelection(index, value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Escolha um profissional" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        {availableEmployees
                          .filter(emp => {
                            const isAlreadyAssigned = currentAssignments.some((a: any) => a.employee_id === emp.user_id);
                            const isAlreadySelected = selectedEmployees.some((selEmp, selIndex) => 
                              selIndex !== index && selEmp === emp.user_id
                            );
                            return !isAlreadyAssigned && !isAlreadySelected;
                          })
                          .map((employee: any) => (
                          <SelectItem key={employee.user_id} value={employee.user_id}>
                            {employee.name} - {employee.employee_role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedEmployees.length > 1 && (
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeEmployeeField(index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAssignDialogOpen(false);
                  setSelectedEmployees(['']);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleAssignProfessional} disabled={!selectedEmployees.some(emp => emp && emp.trim() !== '')}>
                Vincular Selecionados
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
