import { Route, Routes } from "react-router-dom";
import App from "@/App";
import Index from "@/pages/Index";

export const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Index />} />
        </Route>
      </Routes>
    </>
  );
};
