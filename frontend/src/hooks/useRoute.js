import { useEffect, useState } from "react";

function readRoute() {
  const hash = window.location.hash.slice(1);
  return /^(overview|leads|follow-ups|insights|new-lead|guide|lead\/[^/]+)$/.test(
    hash,
  )
    ? hash
    : "overview";
}

export function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const handleChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", handleChange);
    return () => window.removeEventListener("hashchange", handleChange);
  }, []);
  const navigate = (next) => {
    window.location.hash = next;
  };
  return [route, navigate];
}
