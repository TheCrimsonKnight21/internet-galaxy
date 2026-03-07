import React, { useEffect, useRef } from 'react';
import { createGalaxy } from './galaxy/renderer';

interface Props {
  searchTerm: string;
  activeCategories: Set<string>;
}

const GalaxyCanvas: React.FC<Props> = ({ searchTerm, activeCategories }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const galaxyRef = useRef<{ updateFilters: (s: string, c: Set<string>) => void } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Initialize galaxy
    galaxyRef.current = createGalaxy(containerRef.current, searchTerm, activeCategories);
    return () => {
      // Optional cleanup: dispose Three.js resources
    };
  }, []); // Run once on mount

  // Update filters when props change
  useEffect(() => {
    if (galaxyRef.current) {
      galaxyRef.current.updateFilters(searchTerm, activeCategories);
    }
  }, [searchTerm, activeCategories]);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default GalaxyCanvas;