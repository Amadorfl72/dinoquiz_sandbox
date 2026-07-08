import { MuteProvider } from '../audio/MuteContext';
import { MuteToggleButton } from './MuteToggleButton';
import styles from './AppShell.module.css';

/**
 * Shared shell mounted once around every screen (Inicio, Quiz, Feedback,
 * Resultados) so global controls like the mute toggle render exactly once
 * instead of being duplicated per screen.
 */
export function AppShell({ children }) {
  return (
    <MuteProvider>
      <div className={styles.appShell}>
        <header className={styles.globalControls}>
          <MuteToggleButton />
        </header>
        <main className={styles.screenContent}>{children}</main>
      </div>
    </MuteProvider>
  );
}
