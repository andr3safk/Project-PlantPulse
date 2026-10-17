import { createBrowserRouter } from "react-router";
import { Layout } from "./Layout";
import { Dashboard } from "./Dashboard";
import { Diagnosis } from "./Diagnosis";
import { AddPlant } from "./AddPlant";
import { Settings } from "./Settings";
import Login from "./Login";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "diagnosis", Component: Diagnosis },
          { path: "add", Component: AddPlant },
          { path: "settings", Component: Settings },
        ],
      },
    ],
  },
]);
