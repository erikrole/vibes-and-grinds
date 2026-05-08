import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FormModal from './FormModal';

describe('FormModal', () => {
  it('renders title and children inside a labeled dialog', () => {
    render(
      <FormModal title="Add Visit" onClose={() => {}}>
        <p>body</p>
      </FormModal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Add Visit' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('invokes onClose after the close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <FormModal title="Add Visit" onClose={onClose}>
        <p>body</p>
      </FormModal>
    );

    fireEvent.click(screen.getByRole('button', { name: /close add visit/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 1000 });
  });

  it('Escape key closes the modal', async () => {
    const onClose = vi.fn();
    render(
      <FormModal title="Add Visit" onClose={onClose}>
        <button>inside</button>
      </FormModal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 1000 });
  });

  it('clicking the backdrop closes the modal but clicking inside does not', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <FormModal title="Add Visit" onClose={onClose}>
        <p>body content</p>
      </FormModal>
    );

    fireEvent.click(screen.getByText('body content'));
    // Inner click should NOT bubble to backdrop; give the post-click animation
    // 300ms to finish before checking that onClose stayed at 0.
    await new Promise((r) => setTimeout(r, 300));
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = container.querySelector('.bg-black\\/70');
    fireEvent.click(backdrop);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 1000 });
  });
});
