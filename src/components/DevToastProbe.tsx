import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export default function DevToastProbe() {
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        toast({
          title: "Toast system probe",
          description: "If you see this, toasts are wired correctly.",
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("DevToastProbe failed to trigger toast", e);
      }
    }, 800);
    return () => clearTimeout(id);
  }, []);
  return null;
}
