import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styled from "styled-components";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AdminLogin() {
  const router = useRouter();
  const loginAdmin = useMutation(api.admins.loginAdmin);

  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleLogin = async (e) => {
e.preventDefault();
setError("");

try {
const result = await loginAdmin({
username,
password,
});


console.log("LOGIN RESULT:", result);

// If login failed
if (!result.success) {
  setError(result.message);
  return;
}

// Store admin session
sessionStorage.setItem("adminToken", result.token);
sessionStorage.setItem("adminUser", result.username);
sessionStorage.setItem("adminRole", result.role);
sessionStorage.setItem("adminEmail", result.email);

// Redirect to admin dashboard
router.replace("/admin");


} catch (err) {
console.error(err);
setError("Login failed. Please try again.");
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
            required
          />

          <Input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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