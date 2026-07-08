import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataLossNotice } from './DataLossNotice';
import strings from '../i18n/es/strings.json';

const { toggleLabel, body, closeButton } = strings.home.dataLossNotice;

describe('DataLossNotice', () => {
  it('is collapsed by default so it never blocks the child flow', () => {
    render(<DataLossNotice />);

    expect(screen.queryByText(body)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: toggleLabel })).toHaveAttribute('aria-expanded', 'false');
  });

  it('reveals the reinstall data-loss explanation when a parent opts in', async () => {
    const user = userEvent.setup();
    render(<DataLossNotice />);

    await user.click(screen.getByRole('button', { name: toggleLabel }));

    expect(screen.getByRole('note')).toHaveTextContent(body);
  });

  it('collapses again after pressing the close button', async () => {
    const user = userEvent.setup();
    render(<DataLossNotice />);

    await user.click(screen.getByRole('button', { name: toggleLabel }));
    await user.click(screen.getByRole('button', { name: closeButton }));

    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
