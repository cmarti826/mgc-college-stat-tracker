// components/ui/Button.tsx
export function Button({ children, onClick, variant = 'primary' }: { children: React.ReactNode, onClick?: () => void, variant?: 'primary' | 'secondary' }) {
  const base = 'px-4 py-2 rounded-xl font-semibold transition-colors shadow-md'
  const styles = {
    primary: `${base} bg-mgc-red text-white hover:bg-mgc-blue`,
    secondary: `${base} bg-mgc-blue text-white hover:bg-mgc-red`,
  }
  return (
    <button onClick={onClick} className={styles[variant]}>
      {children}
    </button>
  )
}
