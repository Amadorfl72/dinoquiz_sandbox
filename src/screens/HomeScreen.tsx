import { Link } from 'react-router-dom';
import { strings } from '../i18n';
import './HomeScreen.css';

export function HomeScreen() {
  return (
    <main className="home-screen">
      <img
        className="home-screen__mascot"
        src="/assets/mascot.png"
        alt={strings.home.mascotAlt}
      />

      <h1 className="home-screen__title">{strings.home.title}</h1>
      <p className="home-screen__subtitle">{strings.home.subtitle}</p>

      <button type="button" className="home-screen__play-button">
        {strings.home.playButton}
      </button>

      <div className="home-screen__toolbar">
        <Link
          to="/privacidad"
          className="home-screen__icon-button"
          aria-label={strings.home.privacyPolicyIconLabel}
          title={strings.home.privacyPolicyIconHint}
        >
          <span aria-hidden="true">🔒</span>
        </Link>
      </div>
    </main>
  );
}
