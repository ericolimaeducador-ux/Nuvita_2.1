import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { feridasApi, pacientesApi } from '@/api/resources';
import { toItems, formatData } from '@/utils';
import { NovaFeridaDialog } from '@/components/FeridaDialogs';
import { ETIOLOGIA_LABEL, STATUS_FERIDA_LABEL, StatusFerida, type Paciente } from '@/types';
import { useAuth } from '@/auth/AuthContext';

const STATUS_VARIANT: Record<StatusFerida, 'success' | 'default' | 'secondary'> = {
  [StatusFerida.ATIVA]: 'default',
  [StatusFerida.CICATRIZADA]: 'success',
  [StatusFerida.INATIVA]: 'secondary',
};

export function FeridasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pacienteId, setPacienteId] = useState('');
  const [novaOpen, setNovaOpen] = useState(false);

  const pacientesQ = useQuery({ queryKey: ['pacientes', 'select'], queryFn: () => pacientesApi.list({ limit: 100 }) });
  const pacientes = toItems<Paciente>(pacientesQ.data as never);

  const feridasQ = useQuery({
    queryKey: ['feridas', pacienteId],
    queryFn: () => feridasApi.listByPaciente(pacienteId),
    enabled: !!pacienteId,
  });

  return (
    <div>
      <PageHeader
        title="Feridas"
        description="Selecione um paciente para ver e registrar feridas."
        extra={
          <Button onClick={() => setNovaOpen(true)} disabled={!pacienteId}>
            <Plus className="mr-2 h-4 w-4" /> Nova ferida
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <Select value={pacienteId} onValueChange={setPacienteId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
            <SelectContent>
              {pacientes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {pacienteId && (
        <Card>
          <CardContent className="pt-6">
            {feridasQ.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rótulo</TableHead>
                    <TableHead>Etiologia</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(feridasQ.data ?? []).map((f) => (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => navigate(`/feridas/${f.id}`)}>
                      <TableCell className="font-medium">{f.rotulo}</TableCell>
                      <TableCell>{ETIOLOGIA_LABEL[f.etiologia]}</TableCell>
                      <TableCell>{f.localizacao}</TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[f.status]}>{STATUS_FERIDA_LABEL[f.status]}</Badge></TableCell>
                      <TableCell>{f.dataInicio ? formatData(f.dataInicio) : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {(feridasQ.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma ferida registrada.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <NovaFeridaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        pacienteId={pacienteId}
        clinicaId={user?.clinicaId}
        onCreated={() => feridasQ.refetch()}
      />
    </div>
  );
}
