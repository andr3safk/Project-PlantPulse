import { RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import { router } from "./routes";
import { PlantProvider } from "./contexts/PlantContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PlantProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </PlantProvider>
      {/* Fuera del router para que el aviso siga visible al cambiar de página */}
      <Toaster richColors position="top-right" duration={4000} closeButton />
    </ThemeProvider>
  );
}
