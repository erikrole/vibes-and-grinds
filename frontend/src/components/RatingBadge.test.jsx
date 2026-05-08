import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RatingBadge from './RatingBadge';
import CompositeBadge from './CompositeBadge';

describe('RatingBadge', () => {
  it('renders the rating to one decimal place', () => {
    render(<RatingBadge rating={8} label="Vibe" />);
    expect(screen.getByText('8.0')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(<RatingBadge rating={8} label="Vibe" />);
    expect(screen.getByText('Vibe')).toBeInTheDocument();
  });

  it('exposes meter ARIA attributes', () => {
    render(<RatingBadge rating={7.5} label="Coffee" />);
    const meter = screen.getByRole('meter', { name: /coffee rating/i });
    expect(meter).toHaveAttribute('aria-valuenow', '7.5');
    expect(meter).toHaveAttribute('aria-valuemax', '10');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
  });

  it('honors a custom maxRating', () => {
    render(<RatingBadge rating={4} label="Other" maxRating={5} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuemax', '5');
  });
});

describe('CompositeBadge', () => {
  it('renders composite value out of 20', () => {
    render(<CompositeBadge composite={16} />);
    expect(screen.getByText('16.0')).toBeInTheDocument();
    expect(screen.getByText('/ 20')).toBeInTheDocument();
  });

  it('exposes meter ARIA attributes with valuemax 20', () => {
    render(<CompositeBadge composite={16} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuemax', '20');
    expect(meter).toHaveAttribute('aria-valuenow', '16');
  });
});
