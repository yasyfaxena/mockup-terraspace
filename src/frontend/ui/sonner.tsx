import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = (props: ToasterProps) => {
  return <Sonner position="top-right" expand={false} richColors closeButton {...props} />;
};

export { Toaster };
