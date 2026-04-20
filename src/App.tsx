import { useState, useEffect } from "react";
import sitesData from "./Data/sites.json";
import GalaxyCanvas from "./GalaxyCanvas";
import "./App.css";

const categories: string[] = [];
sitesData.planets.forEach((p) => {
  if (!categories.includes(p.category)) {
    categories.push(p.category);
  }
});

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(),
  );
  const [isLocked, setIsLocked] = useState(false);
  const [orbitsPaused, setOrbitsPaused] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipContent, setTooltipContent] = useState({
    name: "",
    traffic: 0,
    category: "",
  });
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ) || window.innerWidth < 768,
      );
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cat)) newSet.delete(cat);
      else newSet.add(cat);
      return newSet;
    });
  };

  const clearFilters = () => {
    setActiveCategories(new Set());
    setSearchTerm("");
  };

  const handleUnlockCamera = () => {
    setIsLocked(false);
  };

  return (
    <div className="app">
      <GalaxyCanvas
        searchTerm={searchTerm}
        activeCategories={activeCategories}
        isLocked={isLocked}
        onLockChange={setIsLocked}
        onOrbitPauseChange={setOrbitsPaused}
        onTooltipUpdate={(visible, content, pos) => {
          setTooltipVisible(visible);
          if (content) setTooltipContent(content);
          if (pos) setTooltipPos(pos);
        }}
      />

      {/* Instructions Panel */}
      <div
        style={{
          position: "absolute",
          ...(isMobile
            ? { bottom: "60px", right: "12px", top: "auto", left: "auto" }
            : { top: "220px", left: "24px", bottom: "auto", right: "auto" }),
          zIndex: 20,
          pointerEvents: "auto",
          background: "rgba(20,20,20,0.85)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "8px",
          color: "white",
          padding: isMobile ? "10px 12px" : "12px 16px",
          fontSize: isMobile ? "11px" : "13px",
          lineHeight: "1.6",
          backdropFilter: "blur(6px)",
          maxWidth: isMobile ? "140px" : "200px",
        }}
      >
        <b>Controls</b>
        <br />
        <span style={{ color: "rgba(255,255,255,0.8)" }}>
          {isMobile ? (
            <>
              Tap: Lock
              <br />
              Long tap: Open link
              <br />
              Drag: Rotate view
            </>
          ) : (
            <>
              Click: Lock camera
              <br />
              Double-click: Open link
            </>
          )}
        </span>
      </div>

      {/* Orbit Pause Toggle */}
      <button
        onClick={() => (window as any).__toggleOrbitPause?.()}
        style={{
          position: "absolute",
          top: isMobile ? "auto" : "24px",
          right: isMobile ? "auto" : "24px",
          bottom: isMobile ? "12px" : "auto",
          left: isMobile ? "12px" : "auto",
          zIndex: 25,
          pointerEvents: "auto",
          background: orbitsPaused
            ? "rgba(100,60,60,0.85)"
            : "rgba(20,20,20,0.85)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "8px",
          color: "white",
          padding: isMobile ? "6px 10px" : "8px 14px",
          cursor: "pointer",
          fontSize: isMobile ? "11px" : "13px",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "4px" : "8px",
          backdropFilter: "blur(6px)",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = orbitsPaused
            ? "rgba(140,80,80,0.9)"
            : "rgba(60,60,60,0.9)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = orbitsPaused
            ? "rgba(100,60,60,0.85)"
            : "rgba(20,20,20,0.85)";
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={isMobile ? "14" : "16"}
          height={isMobile ? "14" : "16"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {orbitsPaused ? (
            <>
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="10" y1="8" x2="10" y2="16" />
              <line x1="14" y1="8" x2="14" y2="16" />
            </>
          )}
        </svg>
        {!isMobile && <span>{orbitsPaused ? "Paused" : "Playing"}</span>}
      </button>

      {/* Lock Button */}
      {isLocked && (
        <button
          onClick={handleUnlockCamera}
          style={{
            display: "flex",
            position: "absolute",
            top: isMobile ? "auto" : "24px",
            right: isMobile ? "auto" : "auto",
            bottom: isMobile ? "12px" : "24px",
            left: isMobile ? "60px" : "24px",
            zIndex: 25,
            pointerEvents: "auto",
            background: "rgba(20,20,20,0.85)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "8px",
            color: "white",
            padding: isMobile ? "6px 10px" : "8px 14px",
            cursor: "pointer",
            fontSize: isMobile ? "11px" : "13px",
            alignItems: "center",
            gap: isMobile ? "4px" : "8px",
            backdropFilter: "blur(6px)",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(60,60,60,0.9)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(20,20,20,0.85)";
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={isMobile ? "14" : "18"}
            height={isMobile ? "14" : "18"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {!isMobile && <span>Locked</span>}
        </button>
      )}

      {/* Tooltip */}
      {tooltipVisible && (
        <div
          style={{
            position: "absolute",
            left: tooltipPos.x + 14 + "px",
            top: tooltipPos.y + 14 + "px",
            pointerEvents: "none",
            padding: "6px 10px",
            background: "rgba(0,0,0,0.75)",
            color: "white",
            borderRadius: "6px",
            fontSize: "12px",
            lineHeight: "1.6",
            whiteSpace: "nowrap",
            border: "1px solid rgba(255,255,255,0.15)",
            zIndex: 10,
          }}
        >
          <b>{tooltipContent.name}</b>
          <br />
          Traffic: {tooltipContent.traffic}
          <br />
          Category: {tooltipContent.category}
        </div>
      )}

      {/* UI Overlay - positioned absolutely over the canvas */}
      <div className="ui-overlay">
        <div className="controls">
          <input
            type="text"
            placeholder="Search planets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={clearFilters} className="clear-btn">
            Clear Filters
          </button>
          <div className="category-filters">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`category-btn ${activeCategories.has(cat) ? "active" : ""}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
