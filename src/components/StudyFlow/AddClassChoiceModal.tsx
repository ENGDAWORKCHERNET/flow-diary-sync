import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageUp, PencilLine } from 'lucide-react';

interface AddClassChoiceModalProps {
  open: boolean;
  onClose: () => void;
  onManual: () => void;
  onUpload: () => void;
}

export default function AddClassChoiceModal({
  open,
  onClose,
  onManual,
  onUpload,
}: AddClassChoiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add a Class</DialogTitle>
          <DialogDescription>Choose how you would like to add this class.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-auto justify-start gap-4 rounded-xl p-4 text-left"
            onClick={onUpload}
          >
            <ImageUp className="h-6 w-6 shrink-0 text-primary" />
            <span className="grid gap-1">
              <span className="font-semibold">Upload Schedule</span>
              <span className="text-sm font-normal text-muted-foreground">
                Take a photo or pick from gallery
              </span>
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto justify-start gap-4 rounded-xl p-4 text-left"
            onClick={onManual}
          >
            <PencilLine className="h-6 w-6 shrink-0 text-primary" />
            <span className="grid gap-1">
              <span className="font-semibold">Do It Yourself</span>
              <span className="text-sm font-normal text-muted-foreground">
                Enter your class details manually
              </span>
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
