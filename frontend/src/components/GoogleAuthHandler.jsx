import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "../api";

export default function GoogleAuthHandler({ setLoggedIn }) {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setToken(token);
      if (setLoggedIn) setLoggedIn(true);
      window.history.replaceState({}, document.title, "/");
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate, setLoggedIn]);

  return null;
}
