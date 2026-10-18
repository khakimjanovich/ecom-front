import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../i18n';
import { SecretReveal } from './SecretReveal';

describe('a new client secret', () => {
  it('can be closed only after the person confirms they stored it', async () => {
    const done = vi.fn();
    render(
      <MantineProvider>
        <SecretReveal clientId="partner-123" secret="s3cr3t" onDone={done} />
      </MantineProvider>,
    );

    expect(screen.getByText('s3cr3t')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Done' });
    expect(button).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(button);
    expect(done).toHaveBeenCalledOnce();
  });
});
