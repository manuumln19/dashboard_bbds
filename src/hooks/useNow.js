import { useEffect, useState } from "react";

export function useNow(interval = 1000, offsetMs = 0) {
  const [now, setNow] = useState(() => new Date(Date.now() + offsetMs));

  useEffect(() => {
    setNow(new Date(Date.now() + offsetMs));
    const timer = setInterval(
      () => setNow(new Date(Date.now() + offsetMs)),
      interval
    );
    return () => clearInterval(timer);
  }, [interval, offsetMs]);

  return now;
}
