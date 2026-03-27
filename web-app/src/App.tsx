import { Outlet } from "react-router-dom";
import "./App.css";
import { Layout } from "@/components/layout/Layout";
import { ThemeWrapper } from "./ThemeWrapper";
import { Toaster } from "sonner";

function App() {
  return (
    <>
      <ThemeWrapper>
        <Layout>
          <Outlet />
        </Layout>
      </ThemeWrapper>
      <Toaster
        toastOptions={{
          classNames: {
            success: 'border-l-4 border-green-500',
            error: 'border-l-4 border-red-500',
            warning: 'border-l-4 border-yellow-500',
            info: 'border-l-4 border-blue-500',
          },
        }}
      />
    </>
  );
}

export default App;
