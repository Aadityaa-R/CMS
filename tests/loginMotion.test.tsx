import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { LoginView } from '../src/views/LoginView';
import { EcgBackground } from '../src/components/auth/EcgBackground';
import { AuthContext } from '../src/context/AuthContext';
import { LOGIN_MOTION, getPrefersReducedMotion } from '../src/styles/loginMotion';
import { ROLE_CREDENTIALS } from '../src/data/mockData';

function createMockAuth(overrides = {}) {
  const completeNavMock = vi.fn();
  const loginMock = vi.fn().mockImplementation(async (_id, _pass, _rem, _options) => {
    return {
      success: true,
      matchedRole: 'md',
      completeNavigation: completeNavMock,
    };
  });

  const authVal: any = {
    currentUser: {
      id: 'usr-md-1',
      name: 'Dr. Marcus Vance',
      email: 'm.vance@beaconclinic.com',
      role: 'md',
    },
    currentRole: 'md',
    isAuthenticated: false,
    roleCredentials: ROLE_CREDENTIALS,
    login: loginMock,
    signUpPatient: vi.fn().mockResolvedValue({ success: true }),
    signUpStaff: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  };

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthContext.Provider value={authVal}>{children}</AuthContext.Provider>
  );

  return { Wrapper, authVal, loginMock, completeNavMock };
}

describe('Login and Sign-Up Screen Motion (M9.6 / M9.8)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    originalMatchMedia = window.matchMedia;
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('respects prefers-reduced-motion: no entrance animation classes, instant transitions, and immediate navigation', async () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(getPrefersReducedMotion()).toBe(true);

    const { Wrapper, loginMock, completeNavMock } = createMockAuth();

    // 1. In chooser step: no entrance classes
    let container: HTMLElement;
    await act(async () => {
      const res = render(
        <Wrapper>
          <LoginView />
        </Wrapper>
      );
      container = res.container;
    });

    const entrance0 = container!.querySelector('.login-entrance-0');
    const entrance3 = container!.querySelector('.login-entrance-3');
    expect(entrance0).toBeNull();
    expect(entrance3).toBeNull();

    cleanup();

    // 2. In form step with ?as=staff: immediate navigation on submit
    window.history.replaceState({}, '', '/?as=staff');
    await act(async () => {
      render(
        <Wrapper>
          <LoginView />
        </Wrapper>
      );
    });

    const submitBtn = screen.getByRole('button', { name: /Sign In to Medical Station/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(loginMock).toHaveBeenCalled();
    // In reduced motion mode, navigation happens immediately without 250ms animation delay
    expect(completeNavMock).toHaveBeenCalled();
  });

  it('handles failed sign-in: applies shake class and polite live region in standard mode; omits shake class under reduced motion', async () => {
    window.history.replaceState({}, '', '/?as=staff');

    // 1. Standard motion mode
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const failLoginMock = vi.fn().mockResolvedValue({
      success: false,
      error: 'Invalid credentials provided.',
    });

    const { Wrapper } = createMockAuth({ login: failLoginMock });

    const { container } = render(
      <Wrapper>
        <LoginView />
      </Wrapper>
    );

    const submitBtn = screen.getByRole('button', { name: /Sign In to Medical Station/i });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Shake class is applied to the card
    const card = container.querySelector('.login-card-shake');
    expect(card).not.toBeNull();

    // Error notice appears in polite live region
    const liveRegion = screen.getByRole('status');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText(/Invalid credentials provided/i)).toBeDefined();

    // Advance 350ms to verify shake class resets
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(container.querySelector('.login-card-shake')).toBeNull();

    cleanup();

    // 2. Reduced motion mode
    window.history.replaceState({}, '', '/?as=staff');
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { Wrapper: ReducedWrapper } = createMockAuth({ login: failLoginMock });
    const { container: reducedContainer } = render(
      <ReducedWrapper>
        <LoginView />
      </ReducedWrapper>
    );

    const reducedSubmitBtn = screen.getByRole('button', { name: /Sign In to Medical Station/i });
    await act(async () => {
      fireEvent.click(reducedSubmitBtn);
    });

    // Message appears in polite live region, but shake class is never applied
    expect(reducedContainer.querySelector('.login-card-shake')).toBeNull();
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText(/Invalid credentials provided/i)).toBeDefined();
  });

  it('ensures chooser buttons and form inputs are immediately focusable and clickable during entrance', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { Wrapper } = createMockAuth();
    render(
      <Wrapper>
        <LoginView />
      </Wrapper>
    );

    const patientBtn = screen.getByRole('button', { name: /Patient Records, bookings and bills/i });
    const staffBtn = screen.getByRole('button', { name: /Clinic Staff Doctors, receptionists and administrators/i });

    // Verify chooser buttons are focusable and clickable from the first frame
    expect(patientBtn.getAttribute('style') || '').not.toContain('pointer-events: none');
    expect(staffBtn.getAttribute('style') || '').not.toContain('pointer-events: none');
    expect(patientBtn.getAttribute('style') || '').not.toContain('visibility: hidden');
    expect(staffBtn.getAttribute('style') || '').not.toContain('visibility: hidden');

    // Clicking transitions to form immediately
    await act(async () => {
      fireEvent.click(staffBtn);
    });

    expect(screen.getByText('Signing in as Clinic Staff')).toBeDefined();
    const usernameInput = screen.getByLabelText(/Username or Email/i) as HTMLInputElement;
    expect(usernameInput).toBeDefined();

    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'doctor' } });
    });
    expect(usernameInput.value).toBe('doctor');
  });

  it('verifies EcgBackground has central column mask and responds to visibilitychange lifecycle', () => {
    const addEventSpy = vi.spyOn(document, 'addEventListener');
    const removeEventSpy = vi.spyOn(document, 'removeEventListener');

    const { container, unmount } = render(<EcgBackground />);

    // Container has the ecg-background-container class and is aria-hidden
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.className).toContain('ecg-background-container');

    const svg = wrapper.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');

    // Central cutout gradient and mask exist in defs
    const centerGradient = container.querySelector('#ecg-center-gradient');
    const centerMask = container.querySelector('#ecg-center-mask');
    expect(centerGradient).not.toBeNull();
    expect(centerMask).not.toBeNull();

    // Verifies visibilitychange listener attached
    expect(addEventSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    // Simulate tab hiding
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    const slider = container.querySelector('.ecg-wipe-slider') as HTMLElement;
    expect(slider?.style.animationPlayState).toBe('paused');

    // Simulate tab visible
    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(slider?.style.animationPlayState).toBe('running');

    // Unmount cleans up listener
    unmount();
    expect(removeEventSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('enforces success exit duration <= 400ms and verifies sign-in to sign-up crossfade retains form state', async () => {
    window.history.replaceState({}, '', '/?as=staff');
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { Wrapper, completeNavMock } = createMockAuth();
    const { container } = render(
      <Wrapper>
        <LoginView />
      </Wrapper>
    );

    // Form state test across view switch
    const usernameInput = screen.getByLabelText(/Username or Email/i) as HTMLInputElement;
    fireEvent.change(usernameInput, { target: { value: 'receptionist_special' } });

    // Switch to sign-up
    const createAccountBtn = screen.getByRole('button', { name: /Create account/i });
    act(() => {
      fireEvent.click(createAccountBtn);
    });

    // Sign-up content is rendered
    expect(screen.getByText('Creating a Clinic Staff account')).toBeDefined();

    // Switch back to sign-in
    const backBtn = screen.getByRole('button', { name: /Back to sign in/i });
    act(() => {
      fireEvent.click(backBtn);
    });

    // Username value is preserved without reset
    const usernameInputAfter = screen.getByLabelText(/Username or Email/i) as HTMLInputElement;
    expect(usernameInputAfter.value).toBe('receptionist_special');

    // Test success exit delay <= 400ms
    const submitBtn = screen.getByRole('button', { name: /Sign In to Medical Station/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Card receives exit animation
    expect(container.querySelector('.login-card-exit')).not.toBeNull();
    expect(completeNavMock).not.toHaveBeenCalled();

    // Advance 250ms (the exit duration token, well within 400ms limit)
    act(() => {
      vi.advanceTimersByTime(LOGIN_MOTION.successExit);
    });

    expect(completeNavMock).toHaveBeenCalled();
    expect(LOGIN_MOTION.successExit).toBeLessThanOrEqual(LOGIN_MOTION.maxSuccessExit);
  });

  it('verifies the form never renders before the URL is read', () => {
    // 1. When ?as=patient is present, directly renders patient form
    window.history.replaceState({}, '', '/?as=patient');
    const { Wrapper } = createMockAuth();

    const { unmount } = render(
      <Wrapper>
        <LoginView />
      </Wrapper>
    );

    expect(screen.queryByText('Who is signing in?')).toBeNull();
    expect(screen.getByText('Signing in as Patient')).toBeDefined();
    unmount();

    // 2. When ?as=staff is present, directly renders staff form
    window.history.replaceState({}, '', '/?as=staff');
    const { unmount: unmountStaff } = render(
      <Wrapper>
        <LoginView />
      </Wrapper>
    );

    expect(screen.queryByText('Who is signing in?')).toBeNull();
    expect(screen.getByText('Signing in as Clinic Staff')).toBeDefined();
    unmountStaff();

    // 3. When no ?as= parameter is present, directly renders chooser step
    window.history.replaceState({}, '', '/');
    render(
      <Wrapper>
        <LoginView />
      </Wrapper>
    );

    expect(screen.getByText('Who is signing in?')).toBeDefined();
    expect(screen.queryByText(/Signing in as/i)).toBeNull();
  });

  it('renders text-only demo notice in form step and only reset demo data button in chooser step', () => {
    const { Wrapper } = createMockAuth();

    // Chooser step: shows reset demo data button, no form demo warning
    render(
      <Wrapper>
        <LoginView />
      </Wrapper>
    );

    expect(screen.getByRole('button', { name: /Reset demo data/i })).toBeDefined();
    expect(screen.queryByText('Demo environment. Do not enter real patient data.')).toBeNull();

    cleanup();

    // Form step: shows text-only demo environment notice
    window.history.replaceState({}, '', '/?as=staff');
    render(
      <Wrapper>
        <LoginView />
      </Wrapper>
    );

    expect(screen.getByText('Demo environment. Do not enter real patient data.')).toBeDefined();
    expect(screen.queryByText(/Encrypted Session/i)).toBeNull();
  });
});
