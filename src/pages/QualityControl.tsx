import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function QualityControl() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Controle de Qualidade</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Qualidade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Funcionalidade em desenvolvimento - avaliação e controle de qualidade dos serviços.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}