import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  Plus, Edit2, Trash2, ClipboardList, FileText, Search, 
  Settings, ListChecks, History, User, Calendar, CheckCircle2,
  FileQuestion, GripVertical, ChevronRight, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnamnesisType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface AnamnesisQuestion {
  id: string;
  anamnesis_type_id: string;
  question_text: string;
  question_type: string;
  options: any;
  is_required: boolean;
  order_index: number;
  created_at: string;
}

interface AnamnesisRecord {
  id: string;
  client_id: string;
  anamnesis_type_id: string;
  filled_by: string;
  answers: any;
  notes: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  clients?: { name: string };
  anamnesis_types?: { name: string };
  profiles?: { name: string };
}

export default function Anamnesis() {
  const { user } = useAuth();
  const [types, setTypes] = useState<AnamnesisType[]>([]);
  const [questions, setQuestions] = useState<AnamnesisQuestion[]>([]);
  const [records, setRecords] = useState<AnamnesisRecord[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [fillDialogOpen, setFillDialogOpen] = useState(false);
  const [viewRecordDialogOpen, setViewRecordDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AnamnesisType | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<AnamnesisQuestion | null>(null);
  const [selectedType, setSelectedType] = useState<AnamnesisType | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AnamnesisRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tipos');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  
  const [questionFormData, setQuestionFormData] = useState({
    question_text: '',
    question_type: 'text',
    options: '',
    is_required: false,
    order_index: 0
  });
  
  const [fillFormData, setFillFormData] = useState<{
    client_id: string;
    anamnesis_type_id: string;
    answers: Record<string, any>;
    notes: string;
  }>({
    client_id: '',
    anamnesis_type_id: '',
    answers: {},
    notes: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadTypes(), loadRecords(), loadClients()]);
    setLoading(false);
  };

  const loadTypes = async () => {
    const { data, error } = await supabase
      .from('anamnesis_types')
      .select('*')
      .order('name');

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar tipos de anamnese' });
    } else {
      setTypes(data || []);
    }
  };

  const loadQuestions = async (typeId: string) => {
    const { data, error } = await supabase
      .from('anamnesis_questions')
      .select('*')
      .eq('anamnesis_type_id', typeId)
      .order('order_index');

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar perguntas' });
    } else {
      setQuestions(data || []);
    }
  };

  const loadRecords = async () => {
    const { data, error } = await supabase
      .from('anamnesis_records')
      .select(`
        *,
        clients!anamnesis_records_client_id_fkey(name),
        anamnesis_types!anamnesis_records_anamnesis_type_id_fkey(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      // Buscar nomes dos profissionais
      const recordsWithProfiles = await Promise.all(data.map(async (record) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', record.filled_by)
          .single();
        return { ...record, profiles: profile };
      }));
      setRecords(recordsWithProfiles);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setClients(data || []);
  };

  const handleSubmitType = async () => {
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Nome é obrigatório' });
      return;
    }

    const typeData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      is_active: formData.is_active
    };

    if (editingType) {
      const { error } = await supabase
        .from('anamnesis_types')
        .update(typeData)
        .eq('id', editingType.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar' });
        return;
      }
      toast({ title: 'Sucesso', description: 'Tipo atualizado' });
    } else {
      const { error } = await supabase
        .from('anamnesis_types')
        .insert([typeData]);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao criar' });
        return;
      }
      toast({ title: 'Sucesso', description: 'Tipo criado' });
    }

    setDialogOpen(false);
    resetTypeForm();
    loadTypes();
  };

  const handleSubmitQuestion = async () => {
    if (!questionFormData.question_text.trim() || !selectedType) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Pergunta é obrigatória' });
      return;
    }

    const questionData = {
      anamnesis_type_id: selectedType.id,
      question_text: questionFormData.question_text.trim(),
      question_type: questionFormData.question_type,
      options: questionFormData.options ? questionFormData.options.split(',').map(o => o.trim()) : null,
      is_required: questionFormData.is_required,
      order_index: questionFormData.order_index
    };

    if (editingQuestion) {
      const { error } = await supabase
        .from('anamnesis_questions')
        .update(questionData)
        .eq('id', editingQuestion.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar pergunta' });
        return;
      }
      toast({ title: 'Sucesso', description: 'Pergunta atualizada' });
    } else {
      const { error } = await supabase
        .from('anamnesis_questions')
        .insert([questionData]);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao criar pergunta' });
        return;
      }
      toast({ title: 'Sucesso', description: 'Pergunta criada' });
    }

    setQuestionDialogOpen(false);
    resetQuestionForm();
    loadQuestions(selectedType.id);
  };

  const handleFillAnamnesis = async () => {
    if (!fillFormData.client_id || !fillFormData.anamnesis_type_id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Selecione paciente e tipo' });
      return;
    }

    const { error } = await supabase
      .from('anamnesis_records')
      .insert([{
        client_id: fillFormData.client_id,
        anamnesis_type_id: fillFormData.anamnesis_type_id,
        filled_by: user?.id,
        answers: fillFormData.answers,
        notes: fillFormData.notes || null,
        status: 'completed',
        completed_at: new Date().toISOString()
      }]);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao salvar anamnese' });
      return;
    }

    toast({ title: 'Sucesso', description: 'Anamnese salva com sucesso!' });
    setFillDialogOpen(false);
    resetFillForm();
    loadRecords();
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Excluir este tipo de anamnese?')) return;
    
    const { error } = await supabase.from('anamnesis_types').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir' });
      return;
    }
    toast({ title: 'Sucesso', description: 'Tipo excluído' });
    loadTypes();
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Excluir esta pergunta?')) return;
    
    const { error } = await supabase.from('anamnesis_questions').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir' });
      return;
    }
    toast({ title: 'Sucesso', description: 'Pergunta excluída' });
    if (selectedType) loadQuestions(selectedType.id);
  };

  const resetTypeForm = () => {
    setEditingType(null);
    setFormData({ name: '', description: '', is_active: true });
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestionFormData({ question_text: '', question_type: 'text', options: '', is_required: false, order_index: 0 });
  };

  const resetFillForm = () => {
    setFillFormData({ client_id: '', anamnesis_type_id: '', answers: {}, notes: '' });
    setQuestions([]);
  };

  const handleEditType = (type: AnamnesisType) => {
    setEditingType(type);
    setFormData({ name: type.name, description: type.description || '', is_active: type.is_active ?? true });
    setDialogOpen(true);
  };

  const handleEditQuestion = (question: AnamnesisQuestion) => {
    setEditingQuestion(question);
    setQuestionFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      options: Array.isArray(question.options) ? question.options.join(', ') : '',
      is_required: question.is_required,
      order_index: question.order_index
    });
    setQuestionDialogOpen(true);
  };

  const handleSelectTypeForQuestions = async (type: AnamnesisType) => {
    setSelectedType(type);
    await loadQuestions(type.id);
    setActiveTab('perguntas');
  };

  const handleSelectTypeForFill = async (typeId: string) => {
    setFillFormData(prev => ({ ...prev, anamnesis_type_id: typeId }));
    await loadQuestions(typeId);
  };

  const filteredTypes = types.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeTypes = filteredTypes.filter(t => t.is_active);
  const inactiveTypes = filteredTypes.filter(t => !t.is_active);

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Texto curto',
      textarea: 'Texto longo',
      select: 'Lista suspensa',
      radio: 'Escolha única',
      checkbox: 'Múltipla escolha',
      date: 'Data',
      number: 'Número'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-1.5 bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 rounded-full" />
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Anamnese Digital
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie tipos, perguntas e registros de anamnese
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={fillDialogOpen} onOpenChange={setFillDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                <FileText className="h-4 w-4" />
                Nova Anamnese
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  Preencher Anamnese
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Paciente *</Label>
                    <Select 
                      value={fillFormData.client_id} 
                      onValueChange={(v) => setFillFormData(prev => ({ ...prev, client_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Anamnese *</Label>
                    <Select 
                      value={fillFormData.anamnesis_type_id} 
                      onValueChange={handleSelectTypeForFill}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {questions.length > 0 && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-lg">Perguntas</h3>
                    {questions.map((question, idx) => (
                      <div key={question.id} className="space-y-2 p-4 bg-muted/30 rounded-lg">
                        <Label className="flex items-center gap-2">
                          <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-sm font-medium">
                            {idx + 1}
                          </span>
                          {question.question_text}
                          {question.is_required && <span className="text-red-500">*</span>}
                        </Label>
                        {question.question_type === 'text' && (
                          <Input 
                            value={fillFormData.answers[question.id] || ''}
                            onChange={(e) => setFillFormData(prev => ({
                              ...prev,
                              answers: { ...prev.answers, [question.id]: e.target.value }
                            }))}
                          />
                        )}
                        {question.question_type === 'textarea' && (
                          <Textarea 
                            value={fillFormData.answers[question.id] || ''}
                            onChange={(e) => setFillFormData(prev => ({
                              ...prev,
                              answers: { ...prev.answers, [question.id]: e.target.value }
                            }))}
                            rows={3}
                          />
                        )}
                        {question.question_type === 'number' && (
                          <Input 
                            type="number"
                            value={fillFormData.answers[question.id] || ''}
                            onChange={(e) => setFillFormData(prev => ({
                              ...prev,
                              answers: { ...prev.answers, [question.id]: e.target.value }
                            }))}
                          />
                        )}
                        {question.question_type === 'date' && (
                          <Input 
                            type="date"
                            value={fillFormData.answers[question.id] || ''}
                            onChange={(e) => setFillFormData(prev => ({
                              ...prev,
                              answers: { ...prev.answers, [question.id]: e.target.value }
                            }))}
                          />
                        )}
                        {(question.question_type === 'select' || question.question_type === 'radio') && question.options && (
                          <Select
                            value={fillFormData.answers[question.id] || ''}
                            onValueChange={(v) => setFillFormData(prev => ({
                              ...prev,
                              answers: { ...prev.answers, [question.id]: v }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {(question.options as string[]).map((opt, i) => (
                                <SelectItem key={i} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={fillFormData.notes}
                    onChange={(e) => setFillFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setFillDialogOpen(false); resetFillForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleFillAnamnesis} className="bg-emerald-600 hover:bg-emerald-700">
                  Salvar Anamnese
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-emerald-500/5">
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
            <Input
              placeholder="🔍 Buscar tipos de anamnese..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 bg-background/50 border-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="tipos" className="gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Tipos</span> ({activeTypes.length})
          </TabsTrigger>
          <TabsTrigger value="perguntas" className="gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Perguntas</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span> ({records.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Tipos */}
        <TabsContent value="tipos" className="mt-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ClipboardList className="h-5 w-5 text-emerald-600" />
                  Tipos de Anamnese
                </CardTitle>
                <CardDescription>Gerencie os modelos de anamnese disponíveis</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetTypeForm(); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Tipo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingType ? 'Editar Tipo' : 'Novo Tipo de Anamnese'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Anamnese Psicológica Infantil"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descrição do tipo de anamnese..."
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Ativo</Label>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmitType}>{editingType ? 'Salvar' : 'Criar'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : activeTypes.length === 0 ? (
                <div className="text-center py-12">
                  <FileQuestion className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Nenhum tipo de anamnese</p>
                  <p className="text-sm text-muted-foreground">Crie um novo tipo para começar</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeTypes.map((type) => (
                    <Card key={type.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-emerald-500/10 hover:border-emerald-500/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{type.name}</CardTitle>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                            Ativo
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {type.description || 'Sem descrição'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleSelectTypeForQuestions(type)}
                          >
                            <ListChecks className="h-4 w-4 mr-1" />
                            Perguntas
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditType(type)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteType(type.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Perguntas */}
        <TabsContent value="perguntas" className="mt-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ListChecks className="h-5 w-5 text-emerald-600" />
                  Perguntas
                  {selectedType && (
                    <Badge variant="outline" className="ml-2">{selectedType.name}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedType 
                    ? `Configure as perguntas para "${selectedType.name}"`
                    : 'Selecione um tipo de anamnese para ver as perguntas'
                  }
                </CardDescription>
              </div>
              {selectedType && (
                <Dialog open={questionDialogOpen} onOpenChange={(open) => { setQuestionDialogOpen(open); if (!open) resetQuestionForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nova Pergunta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Pergunta *</Label>
                        <Textarea
                          value={questionFormData.question_text}
                          onChange={(e) => setQuestionFormData(prev => ({ ...prev, question_text: e.target.value }))}
                          placeholder="Digite a pergunta..."
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de resposta</Label>
                          <Select
                            value={questionFormData.question_type}
                            onValueChange={(v) => setQuestionFormData(prev => ({ ...prev, question_type: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto curto</SelectItem>
                              <SelectItem value="textarea">Texto longo</SelectItem>
                              <SelectItem value="select">Lista suspensa</SelectItem>
                              <SelectItem value="radio">Escolha única</SelectItem>
                              <SelectItem value="checkbox">Múltipla escolha</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Ordem</Label>
                          <Input
                            type="number"
                            value={questionFormData.order_index}
                            onChange={(e) => setQuestionFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                      {['select', 'radio', 'checkbox'].includes(questionFormData.question_type) && (
                        <div className="space-y-2">
                          <Label>Opções (separadas por vírgula)</Label>
                          <Input
                            value={questionFormData.options}
                            onChange={(e) => setQuestionFormData(prev => ({ ...prev, options: e.target.value }))}
                            placeholder="Ex: Sim, Não, Às vezes"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <Label>Obrigatória</Label>
                        <Switch
                          checked={questionFormData.is_required}
                          onCheckedChange={(checked) => setQuestionFormData(prev => ({ ...prev, is_required: checked }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSubmitQuestion}>{editingQuestion ? 'Salvar' : 'Criar'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {!selectedType ? (
                <div className="text-center py-12">
                  <ChevronRight className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Selecione um tipo de anamnese</p>
                  <p className="text-sm text-muted-foreground">Clique em "Perguntas" em algum tipo na aba Tipos</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12">
                  <FileQuestion className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Nenhuma pergunta</p>
                  <p className="text-sm text-muted-foreground">Adicione perguntas para este tipo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((question, idx) => (
                    <div key={question.id} className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{question.question_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{getQuestionTypeLabel(question.question_type)}</Badge>
                          {question.is_required && <Badge variant="secondary" className="text-xs">Obrigatória</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEditQuestion(question)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteQuestion(question.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="historico" className="mt-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <History className="h-5 w-5 text-emerald-600" />
                Histórico de Anamneses
              </CardTitle>
              <CardDescription>Anamneses preenchidas recentemente</CardDescription>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Nenhuma anamnese</p>
                  <p className="text-sm text-muted-foreground">Clique em "Nova Anamnese" para começar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="hidden md:table-cell">Preenchido por</TableHead>
                        <TableHead className="hidden sm:table-cell">Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {record.clients?.name || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>{record.anamnesis_types?.name || 'N/A'}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {record.profiles?.name || 'N/A'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {format(new Date(record.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={record.status === 'completed' ? 'default' : 'secondary'}
                              className={record.status === 'completed' ? 'bg-emerald-600' : ''}
                            >
                              {record.status === 'completed' ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" /> Completo</>
                              ) : 'Rascunho'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => { setSelectedRecord(record); setViewRecordDialogOpen(true); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Ver Anamnese */}
      <Dialog open={viewRecordDialogOpen} onOpenChange={setViewRecordDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Visualizar Anamnese
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-muted-foreground text-xs">Paciente</Label>
                  <p className="font-medium">{selectedRecord.clients?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo</Label>
                  <p className="font-medium">{selectedRecord.anamnesis_types?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Preenchido por</Label>
                  <p className="font-medium">{selectedRecord.profiles?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data</Label>
                  <p className="font-medium">{format(new Date(selectedRecord.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
              
              {selectedRecord.answers && Object.keys(selectedRecord.answers).length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Respostas</h3>
                  {Object.entries(selectedRecord.answers).map(([key, value], idx) => (
                    <div key={key} className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Pergunta {idx + 1}</p>
                      <p className="font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedRecord.notes && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <Label className="text-muted-foreground text-xs">Observações</Label>
                  <p className="mt-1">{selectedRecord.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRecordDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}