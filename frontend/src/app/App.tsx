import { RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import { router } from "./routes";
import { PlantProvider } from "./contexts/PlantContext";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PlantProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </PlantProvider>
    </ThemeProvider>
  );
}
