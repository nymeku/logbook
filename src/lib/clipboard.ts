import { toaster } from "../components/ui/toaster";

export const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toaster.create({ type: "success", title: `${label} copié`, duration: 1500 });
  } catch {
    toaster.create({ type: "error", title: "Copie impossible", duration: 2500 });
  }
};
