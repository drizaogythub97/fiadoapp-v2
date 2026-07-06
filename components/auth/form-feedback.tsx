import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

export function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle aria-hidden="true" />
      <AlertDescription className="text-base">{message}</AlertDescription>
    </Alert>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <Alert
      role="status"
      className="border-success/40 bg-success/10 text-success"
    >
      <CheckCircle2 aria-hidden="true" />
      <AlertDescription className="text-success/90 text-base">
        {message}
      </AlertDescription>
    </Alert>
  );
}
