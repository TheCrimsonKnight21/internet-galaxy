import { useEffect, useRef } from "react";
import { createGalaxy } from "./galaxy/renderer";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      createGalaxy(containerRef.current);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", background: "black" }}
    />
  );
}

export default App;