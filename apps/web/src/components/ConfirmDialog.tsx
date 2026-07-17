import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

/** Confirmação de exclusão (soft-delete) reutilizada em várias telas de paciente. */
export function ConfirmExcluirDialog({ open, titulo, descricao, pending, onCancel, onConfirm }: {
  open: boolean; titulo: string; descricao: React.ReactNode; pending: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{titulo}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{descricao}</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            <Trash2 className="mr-2 h-4 w-4" /> {pending ? 'Excluindo…' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
