import { useId, useState } from 'react';
import styles from './DataLossNotice.module.css';
import strings from '../i18n/es/strings.json';

export function DataLossNotice() {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const { toggleLabel, title, body, closeButton } = strings.home.dataLossNotice;

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className={styles.icon} aria-hidden="true">
          ℹ️
        </span>
        <span>{toggleLabel}</span>
      </button>

      {expanded && (
        <div id={panelId} role="note" className={styles.panel}>
          <p className={styles.panelTitle}>{title}</p>
          <p>{body}</p>
          <button type="button" className={styles.closeButton} onClick={() => setExpanded(false)}>
            {closeButton}
          </button>
        </div>
      )}
    </div>
  );
}
