import { Route, Routes } from "react-router-dom";
import App from "@/App";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";

export const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </>
  );
};
