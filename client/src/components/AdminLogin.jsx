
import { useState } from "react";
import { LockKeyhole, User, Eye, EyeOff } from "lucide-react";

export default function AdminLogin({ apiRequest, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Username এবং Password দিন");
      return;
    }

    try {
      setLoading(true);

      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      onLogin(result.data.admin);
    } catch (err) {
      setError(err.message || "Login করা যায়নি");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f3f5f9",
      padding: 20,
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "#fff",
        borderRadius: 16,
        padding: 32,
        boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
      }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          background: "#eef2ff",
          color: "#4f46e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <LockKeyhole size={30} />
        </div>

        <h2 style={{
          textAlign: "center",
          margin: "0 0 8px",
          color: "#172033",
        }}>
          Admin Login
        </h2>

        <p style={{
          textAlign: "center",
          color: "#7b8494",
          marginBottom: 28,
        }}>
          Sign in to access your ERP Dashboard
        </p>

        <form onSubmit={handleLogin}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>
            Username
          </label>

          <div style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #dce1e9",
            borderRadius: 9,
            padding: "0 12px",
            marginTop: 8,
            marginBottom: 18,
          }}>
            <User size={18} color="#8791a2" />

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                padding: 13,
                fontSize: 15,
              }}
            />
          </div>

          <label style={{ fontWeight: 600, fontSize: 14 }}>
            Password
          </label>

          <div style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #dce1e9",
            borderRadius: 9,
            padding: "0 12px",
            marginTop: 8,
            marginBottom: 18,
          }}>
            <LockKeyhole size={18} color="#8791a2" />

            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                padding: 13,
                fontSize: 15,
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#8791a2",
              }}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          {error && (
            <div style={{
              color: "#dc2626",
              background: "#fef2f2",
              padding: 11,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              border: "none",
              borderRadius: 9,
              background: loading ? "#818cf8" : "#4f46e5",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Logging in..." : "Login to Dashboard"}
          </button>
        </form>

        <p style={{
          textAlign: "center",
          color: "#9aa2af",
          fontSize: 12,
          marginTop: 25,
          marginBottom: 0,
        }}>
          Secure ERP Admin Access
        </p>
      </div>
    </div>
  );
}
