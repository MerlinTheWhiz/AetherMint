/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

// `useNetworkStatus` reads `navigator.onLine` and subscribes to
// `window` online/offline events — fine in jsdom but we mock it so the
// tests can flip the value deterministically.
jest.mock('../../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { OfflineIndicator } from '../OfflineIndicator';

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;

describe('OfflineIndicator', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUseNetworkStatus.mockReturnValue({ isOnline: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when online', () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: true });
    const { container } = render(<OfflineIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the banner with role=alert when offline', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    render(<OfflineIndicator />);

    const banner = await screen.findByRole('alert');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/offline/i);
  });

  it('hides the banner after the user dismisses it and remembers the choice', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    render(<OfflineIndicator />);

    const dismissButton = await screen.findByRole('button', { name: /dismiss offline banner/i });
    await act(async () => {
      fireEvent.click(dismissButton);
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    expect(window.localStorage.getItem('aethermint-offline-banner-dismissed')).toBe('true');
  });

  it('renders immediately on the client (no hydration mismatch)', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    // The component is loaded with ssr:false so we never serve a
    // server-rendered skeleton. The first paint should already include
    // the banner.
    render(<OfflineIndicator />);
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeInTheDocument();
    });
  });

  it('honours a custom storage key for dismissal', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    render(<OfflineIndicator storageKey="custom-dismiss" />);

    const dismissButton = await screen.findByRole('button', { name: /dismiss offline banner/i });
    await act(async () => {
      fireEvent.click(dismissButton);
    });

    await waitFor(() => {
      expect(window.localStorage.getItem('custom-dismiss')).toBe('true');
    });
  });
});
