import { useEffect, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { useRouter } from "next/router";

export default function AdminDashboard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  //  ADMIN AUTH GUARD
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;

    const token = sessionStorage.getItem("adminToken");
    const userRole = sessionStorage.getItem("adminRole");

    if (!token) {
      router.replace("/admin/admin-login");
    } else {
      setRole(userRole);
      setChecking(false);
    }
  }, [router, mounted]);

  //  LOCK BACK BUTTON
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;

    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mounted]);

  //  LOADING SCREEN
  if (!mounted || checking) {
    return (
      <div style={{ textAlign: "center", marginTop: "40vh", fontSize: "18px" }}>
        Verifying admin access...
      </div>
    );
  }

  return (
    <PageWrapper>
      <Card>
        <Title>Admin Dashboard</Title>
        <Subtitle>Manage typing tests, sessions, results, and students</Subtitle>

        <Menu>
          <MenuItem href="/upload-text">
            <span>📤</span> Upload Paragraph File
          </MenuItem>

          <MenuItem href="/admin/sessions">
            <span>🗂️</span> Manage Sessions
          </MenuItem>

          <MenuItem href="/admin/results">
            <span>📊</span> View Test Results
          </MenuItem>

          <MenuItem href="/admin/import-students">
            <span>📥</span> Import Students
          </MenuItem>

          {role === "super_admin" && (
            <MenuItem href="/admin/create-admin">
              <span>👤</span> Create New Admin
            </MenuItem>
          )}

          {/*  ADMIN LOGOUT */}
          <LogoutButton
            onClick={() => {
              sessionStorage.clear();
              sessionStorage.removeItem("adminUser");
              router.replace("/admin/admin-login"); // ✅ FIXED PATH
            }}
          >
            🚪 Logout Admin
          </LogoutButton>
        </Menu>
      </Card>
    </PageWrapper>
  );
}

/* -----------------------------
     STYLED COMPONENTS
------------------------------ */

const PageWrapper = styled.div`
  min-height: 100vh;
  background: #eef2f7;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
`;

const Card = styled.div`
  background: white;
  width: 100%;
  max-width: 600px;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.4s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1b1f23;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #555;
  margin-bottom: 32px;
`;

const Menu = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const MenuItem = styled(Link)`
  background: #f9fafb;
  padding: 18px 22px;
  border-radius: 12px;
  font-size: 18px;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid #e1e5ea;
  color: #333;
  transition: all 0.25s ease;

  span {
    font-size: 24px;
  }

  &:hover {
    background: #ffffff;
    border-color: #b8c3cf;
    transform: translateY(-2px);
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
  }
`;

const LogoutButton = styled.button`
  background: #564dffff;
  padding: 18px;
  border-radius: 12px;
  font-size: 18px;
  border: none;
  color: white;
  cursor: pointer;
  margin-top: 20px;

  &:hover {
    background: #564dffff;
  }
`;
