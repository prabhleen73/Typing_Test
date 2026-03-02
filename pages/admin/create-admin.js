import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styled from "styled-components";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAction } from "convex/react";

export default function CreateAdmin() {
  const sendAdminEmail = useAction(api.email.sendAdminEmail);
  const router = useRouter();
  const createAdmin = useMutation(api.admins.createAdmin);

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only allow super admin
  useEffect(() => {
    if (!mounted) return;

    const role = sessionStorage.getItem("adminRole");
    if (role !== "super_admin") {
      router.replace("/admin");
    }
  }, [mounted, router]);

  if (!mounted) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      setMessage("Please fill all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await createAdmin({
  name: name.trim(),
  email: email.trim(),
});

// Call action (no CORS, no fetch)
await fetch("/api/send-admin-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: email.trim(),
    username: result.username,
    password: result.password,
  }),
});
      

      setMessage(
        `✔ Admin Created Successfully!\n\nUsername: ${result.username}\nPassword: ${result.password}\n\nCredentials have been sent to the admin email.`
      );

      setName("");
      setEmail("");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong. Check logs.");
    }

    setLoading(false);
  };

  return (
    <PageWrapper>
      <Card>
        <Title>Enroll Test Admin</Title>

        <Form onSubmit={handleSubmit}>
          <Input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Admin"}
          </Button>
        </Form>

        {message && <Message>{message}</Message>}
      </Card>
    </PageWrapper>
  );
}

/* ---------------- STYLES ---------------- */

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
  max-width: 450px;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  margin-bottom: 25px;
  font-size: 24px;
  font-weight: 600;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Input = styled.input`
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 14px;
`;

const Button = styled.button`
  padding: 12px;
  background: #5f27cd;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    opacity: 0.9;
  }
`;

const Message = styled.pre`
  margin-top: 20px;
  background: #f3f4f6;
  padding: 15px;
  border-radius: 8px;
  font-size: 14px;
  white-space: pre-wrap;
`;