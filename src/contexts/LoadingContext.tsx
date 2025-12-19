import React, { createContext, useContext, useState, useLayoutEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import loadingPikachu from '@/assets/loading-pikachu.gif';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Componente do overlay separado para melhor performance
function LoadingOverlay({ message }: { message: string }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Força a renderização imediata do overlay
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '1';
    }
  }, []);

  return createPortal(
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-100"
      style={{ opacity: 1 }}
    >
      <div className="flex flex-col items-center gap-4">
        <img 
          src={loadingPikachu} 
          alt="Carregando" 
          className="w-32 h-32 object-contain"
          loading="eager"
        />
        <p className="text-lg font-medium text-foreground animate-pulse">
          {message}
        </p>
      </div>
    </div>,
    document.body
  );
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Carregando...');

  const showLoading = (message: string = 'Carregando...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, showLoading, hideLoading }}>
      {children}
      {isLoading && <LoadingOverlay message={loadingMessage} />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
