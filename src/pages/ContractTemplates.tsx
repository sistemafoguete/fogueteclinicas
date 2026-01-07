import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { ContractDocumentEditor } from '@/components/ContractDocumentEditor';
import { 
  FileText, Plus, Edit, Trash2, Star, Eye, Copy, 
  Save, AlertTriangle, Code, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ContractTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  is_default: boolean;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

// Lista de variáveis disponíveis
const AVAILABLE_VARIABLES = [
  { variable: '{{TEXTO_PARTES}}', description: 'Texto completo da seção "Das Partes" (gerado automaticamente)' },
  { variable: '{{NOME_CONTRATANTE}}', description: 'Nome do responsável financeiro' },
  { variable: '{{CPF_CONTRATANTE}}', description: 'CPF do responsável' },
  { variable: '{{NOME_BENEFICIARIO}}', description: 'Nome do paciente/beneficiário' },
  { variable: '{{CPF_BENEFICIARIO}}', description: 'CPF do beneficiário' },
  { variable: '{{ENDERECO}}', description: 'Endereço completo' },
  { variable: '{{VALOR}}', description: 'Valor do contrato (ex: 1.600,00)' },
  { variable: '{{VALOR_EXTENSO}}', description: 'Valor por extenso (ex: mil e seiscentos reais)' },
  { variable: '{{FORMA_PAGAMENTO}}', description: 'Detalhes da forma de pagamento' },
  { variable: '{{DATA_DIA}}', description: 'Dia atual' },
  { variable: '{{DATA_MES}}', description: 'Mês por extenso' },
  { variable: '{{DATA_ANO}}', description: 'Ano atual' },
];

// Dados de exemplo para preview
const SAMPLE_DATA = {
  TEXTO_PARTES: 'A pessoa jurídica Fundação Dom Bosco, registrada no CNPJ sob o nº 17.278.904/0001-86, com endereço comercial à Rua Urucuia, 18 – Bairro Floresta, Belo Horizonte – MG, denominada neste como CONTRATADA e a pessoa física Maria da Silva, registrada no CPF sob o nº 123.456.789-00, denominada neste como CONTRATANTE, responsável legal ou financeiro por João da Silva, inscrito no CPF sob o nº 987.654.321-00, denominado neste como beneficiário do serviço, residente à Rua das Flores, 123 - Centro, Belo Horizonte/MG firmam contrato de prestação de serviço de avaliação neuropsicológica que será realizado conforme as cláusulas abaixo.',
  NOME_CONTRATANTE: 'Maria da Silva',
  CPF_CONTRATANTE: '123.456.789-00',
  NOME_BENEFICIARIO: 'João da Silva',
  CPF_BENEFICIARIO: '987.654.321-00',
  ENDERECO: 'Rua das Flores, 123 - Centro, Belo Horizonte/MG',
  VALOR: '1.600,00',
  VALOR_EXTENSO: 'mil e seiscentos reais',
  FORMA_PAGAMENTO: '(X) R$ 1.600,00 à vista via PIX na data da anamnese.',
  DATA_DIA: '18',
  DATA_MES: 'dezembro',
  DATA_ANO: '2024',
};

export default function ContractTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userRole, loading: roleLoading } = useRolePermissions();
  
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // Permitir acesso para diretor e coordinator_floresta
  const hasTemplateAccess = userRole === 'director' || userRole === 'coordinator_floresta';
  
  useEffect(() => {
    if (!roleLoading && hasTemplateAccess) {
      loadTemplates();
    }
  }, [roleLoading, userRole, hasTemplateAccess]);
  
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os templates.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateContent('');
    setShowPreview(false);
    setIsEditorOpen(true);
  };
  
  const handleEditTemplate = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateContent(template.content);
    setShowPreview(false);
    setIsEditorOpen(true);
  };
  
  const handleDuplicateTemplate = (template: ContractTemplate) => {
    setEditingTemplate(null);
    setTemplateName(`${template.name} (Cópia)`);
    setTemplateDescription(template.description || '');
    setTemplateContent(template.content);
    setShowPreview(false);
    setIsEditorOpen(true);
  };
  
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome do template é obrigatório.",
      });
      return;
    }
    
    if (!templateContent.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O conteúdo do template é obrigatório.",
      });
      return;
    }
    
    setSaving(true);
    try {
      if (editingTemplate) {
        // Update existing
        const { error } = await supabase
          .from('contract_templates')
          .update({
            name: templateName,
            description: templateDescription || null,
            content: templateContent,
            version: editingTemplate.version + 1,
            updated_by: user?.id,
          })
          .eq('id', editingTemplate.id);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Template atualizado com sucesso!",
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('contract_templates')
          .insert({
            name: templateName,
            description: templateDescription || null,
            content: templateContent,
            created_by: user?.id,
          });
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Template criado com sucesso!",
        });
      }
      
      setIsEditorOpen(false);
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível salvar o template.",
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleSetDefault = async (template: ContractTemplate) => {
    try {
      // Remove default from all
      await supabase
        .from('contract_templates')
        .update({ is_default: false })
        .neq('id', template.id);
      
      // Set this as default
      const { error } = await supabase
        .from('contract_templates')
        .update({ is_default: true })
        .eq('id', template.id);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: `"${template.name}" definido como template padrão.`,
      });
      
      loadTemplates();
    } catch (error) {
      console.error('Error setting default:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível definir o template padrão.",
      });
    }
  };
  
  const handleToggleActive = async (template: ContractTemplate) => {
    try {
      const { error } = await supabase
        .from('contract_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: template.is_active ? "Template desativado." : "Template ativado.",
      });
      
      loadTemplates();
    } catch (error) {
      console.error('Error toggling active:', error);
    }
  };
  
  const handleDeleteTemplate = async (template: ContractTemplate) => {
    if (template.is_default) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não é possível excluir o template padrão.",
      });
      return;
    }
    
    if (!confirm(`Deseja realmente excluir o template "${template.name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', template.id);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Template excluído com sucesso.",
      });
      
      loadTemplates();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };
  
  const insertVariable = (variable: string) => {
    setTemplateContent(prev => prev + variable);
  };
  
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!hasTemplateAccess) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas diretores e coordenadores do Floresta podem gerenciar templates de contrato.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Templates de Contrato
            </h1>
            <p className="text-muted-foreground">
              Gerencie e personalize os templates de contrato
            </p>
          </div>
        </div>
        
        <Button onClick={handleNewTemplate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>
      
      {/* Templates List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="py-10 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Carregando templates...</p>
            </CardContent>
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro template de contrato.
              </p>
              <Button onClick={handleNewTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card 
              key={template.id} 
              className={`${!template.is_active ? 'opacity-60' : ''} ${template.is_default ? 'border-primary' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <Badge className="bg-primary">
                          <Star className="h-3 w-3 mr-1" />
                          Padrão
                        </Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {template.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{template.version}</Badge>
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() => handleToggleActive(template)}
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Duplicar
                  </Button>
                  
                  {!template.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(template)}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Definir como Padrão
                    </Button>
                  )}
                  
                  {!template.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTemplate(template)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-4">
                  Atualizado em: {new Date(template.updated_at).toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="editor" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor" className="gap-2">
                  <Code className="h-4 w-4" />
                  Editor
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="editor" className="flex-1 overflow-hidden mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                  {/* Main Editor - Visual Word-like */}
                  <div className="lg:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome do Template *</Label>
                        <Input
                          id="name"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Ex: Contrato Avaliação Neuropsicológica"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                          id="description"
                          value={templateDescription}
                          onChange={(e) => setTemplateDescription(e.target.value)}
                          placeholder="Descrição breve do template"
                        />
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden border rounded-lg">
                      <ContractDocumentEditor
                        content={templateContent}
                        onChange={setTemplateContent}
                      />
                    </div>
                  </div>
                  
                  {/* Variables Panel */}
                  <div className="border rounded-lg p-4 h-full overflow-hidden flex flex-col">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Variáveis Disponíveis
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Clique para inserir no editor
                    </p>
                    
                    <ScrollArea className="flex-1">
                      <div className="space-y-2">
                        {AVAILABLE_VARIABLES.map((v) => (
                          <button
                            key={v.variable}
                            onClick={() => insertVariable(v.variable)}
                            className="w-full text-left p-2 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <code className="text-xs font-mono text-primary block mb-1">
                              {v.variable}
                            </code>
                            <span className="text-xs text-muted-foreground">
                              {v.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
                <div className="h-full border rounded-lg overflow-hidden">
                  <ContractDocumentEditor
                    content={templateContent}
                    onChange={() => {}}
                    readOnly={true}
                    previewData={SAMPLE_DATA}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Template
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
