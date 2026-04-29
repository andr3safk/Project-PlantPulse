import { RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import { router } from "./routes";
import { PlantProvider } from "./contexts/PlantContext";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PlantProvider>
        <RouterProvider router={router} />
      </PlantProvider>
    </ThemeProvider>
  );
}
