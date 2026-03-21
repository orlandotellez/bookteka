import { Route, Routes } from "react-router-dom";
import App from "@/App";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import Login from "@/pages/auth/Login";
import { ProtectedRoute } from "./ProtectedRoute";
import { NotFound } from "@/pages/NotFound";
import Register from "@/pages/auth/Register";
import { PublicRoute } from "./PublicRoute";

export const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route element={<App />}>
          <Route path="/auth/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/auth/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
};
