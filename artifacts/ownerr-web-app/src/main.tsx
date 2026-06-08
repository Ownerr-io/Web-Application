import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initProductionConsole } from "@/lib/observability/devLog";

initProductionConsole();

createRoot(document.getElementById("root")!).render(<App />);
