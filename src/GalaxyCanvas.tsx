import React, { useEffect, useRef } from "react";
import { createGalaxy } from "./galaxy/renderer";

interface Props {
  searchTerm: string;
  activeCategories: Set<string>;
  isLocked: boolean;
  onLockChange: (locked: boolean) => void;
  onOrbitPauseChange?: (paused: boolean) => void;
  onTooltipUpdate: (
    visible: boolean,
    content?: { name: string; traffic: number; category: string },
    pos?: { x: number; y: number },
  ) => void;
}

const GalaxyCanvas: React.FC<Props> = ({
  searchTerm,
  activeCategories,
  isLocked,
  onLockChange,
  onOrbitPauseChange,
  onTooltipUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const galaxyRef = useRef<ReturnType<typeof createGalaxy> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    galaxyRef.current = createGalaxy(
      containerRef.current,
      searchTerm,
      activeCategories,
      isLocked,
      onLockChange,
      onTooltipUpdate,
    );

    return () => {
      galaxyRef.current?.dispose();
      galaxyRef.current = null;
    };
  }, []); // Run once on mount

  useEffect(() => {
    galaxyRef.current?.updateFilters(searchTerm, activeCategories);
  }, [searchTerm, activeCategories]);

  useEffect(() => {
    galaxyRef.current?.updateLockState(isLocked);
  }, [isLocked]);

  // Expose orbit pause toggle to parent
  (window as any).__toggleOrbitPause = () => {
    const paused = galaxyRef.current?.toggleOrbitPause();
    if (paused !== undefined) {
      onOrbitPauseChange?.(paused);
    }
  };

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
};

export default GalaxyCanvas;
