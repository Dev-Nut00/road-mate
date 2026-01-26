"use client";

import { useEffect, useState, Suspense } from "react";
import Dashboard from "./components/dashboard";
import AuthForm from "./components/auth-form";
import { getMe } from "@/lib/api";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const userData = await getMe();
          setUser(userData);
        } catch (e) {
          console.error("Failed to fetch user", e);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('username');
        }
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const handleLoginSuccess = async (username: string) => {
    try {
      const userData = await getMe();
      setUser(userData);
    } catch (e) {
      console.error("Failed to fetch user after login", e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    setUser(null);
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <AuthForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <Dashboard user={user} onLogout={handleLogout} />
    </Suspense>
  );
}
