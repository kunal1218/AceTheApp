import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "../api";

export default function GoogleAuthHandler({ setLoggedIn }) {
  const navigate = useNavigate();

  const extractToken = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return (
      searchParams.get("token") ||
      searchParams.get("jwt") ||
      searchParams.get("access_token") ||
      hashParams.get("token") ||
      hashParams.get("jwt") ||
      hashParams.get("access_token")
    );
  };

  useEffect(() => {
    const token = extractToken();
    if (token) {
      setToken(token);
      if (setLoggedIn) setLoggedIn(true);
      window.history.replaceState({}, document.title, "/profile");
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate, setLoggedIn]);

  return null;
}
