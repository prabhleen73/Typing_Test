import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styled from "styled-components";

export default function AdminLogin() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false); // ✅ hydration fix
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // ✅ Run only on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // ✅ prevents hydration mismatch
  }

  const handleLogin = (e) => {
    e.preventDefault();

    const ADMIN_USER = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
    const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      sessionStorage.setItem("isAdmin", "true");
      sessionStorage.setItem("adminUser", username);

      router.replace("/admin");
    } else {
      setError("Invalid admin credentials");
    }
  };

  return (
    <Wrapper>
      <Card>
        <Title>Admin Login</Title>

        <Form onSubmit={handleLogin}>
          <Input
            placeholder="Admin Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <Input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit">Login</Button>
        </Form>

        {error && <Error>{error}</Error>}
      </Card>
    </Wrapper>
  );
}

/* ---------------- STYLES ---------------- */

const Wrapper = styled.div`
  min-height: 100vh;
  background: #eef2f7;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Card = styled.div`
  background: white;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const Title = styled.h2`
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Input = styled.input`
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
`;

const Button = styled.button`
  padding: 12px;
  background: #5f27cd;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
`;

const Error = styled.p`
  margin-top: 12px;
  color: red;
`;
