export function SplashScreen() {
  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--sans)',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* Logo animado */}
      <div
        style={{
          width: '80px',
          height: '80px',
          backgroundImage: 'url(/icon.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />

      {/* Nombre de la app */}
      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          letterSpacing: '0.05em',
          opacity: 0.8,
        }}
      >
        WorkDeepSpace
      </div>

      {/* Indicador de loading */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '0.5rem',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--text-faint)',
              animation: `bounce 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
