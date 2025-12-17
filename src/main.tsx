// Importações necessárias para inicializar a aplicação React
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ponto de entrada da aplicação React
// Cria a raiz do aplicativo React e renderiza o componente App no elemento com id "root"
createRoot(document.getElementById("root")!).render(<App />);
