import { Outlet } from "react-router-dom";
import "./App.css";
import { Layout } from "@/components/layout/Layout";
import { ThemeWrapper } from "./ThemeWrapper";

function App() {
  return (
    <>
      <ThemeWrapper>
        <Layout>
          <Outlet />
        </Layout>
      </ThemeWrapper>
    </>
  );
}

export default App;
