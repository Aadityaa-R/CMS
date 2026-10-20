import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { LoginView } from '../src/views/LoginView';
import { SignUpView } from '../src/views/SignUpView';
import { DevCredentialsDirectory } from '../src/views/DevCredentialsDirectory';
import { AuthContext } from '../src/context/AuthContext';
import { ROLE_CREDENTIALS } from '../src/data/mockData';

function createMockAuth(overrides = {}) {
  const completeNavMock = vi.fn();
  const signUpPatientMock = vi.fn().mockResolvedValue({ success: true });
  const signUpStaffMock = vi.fn().mockResolvedValue({ success: true });
  const loginMock = vi.fn().mockImplementation(async (_id, _pass, _aud, _rem, _options) => {
    return {
      code: 'success',
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
    signUpPatient: signUpPatientMock,
    signUpStaff: signUpStaffMock,
    ...overrides,
  };

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthContext.Provider value={authVal}>{children}</AuthContext.Provider>
  );

  return { Wrapper, authVal, loginMock, signUpPatientMock, signUpStaffMock, completeNavMock };
}

describe('Login and Sign-Up Account Type Chooser (M9.8)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('cms_login_intro_seen', 'true');
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  describe('Chooser Step and Removal of Tabs', () => {
    it('defaults to the chooser step with two equal outlined buttons and no tabs', async () => {
      const { Wrapper } = createMockAuth();
      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      // No tablist or tab elements must exist
      expect(screen.queryByRole('tablist')).toBeNull();
      expect(screen.queryByRole('tab')).toBeNull();

      // Heading and audience choice buttons
      expect(screen.getByText('Who is signing in?')).toBeDefined();
      const patientBtn = screen.getByRole('button', { name: /Patient Records, bookings and bills/i });
      const staffBtn = screen.getByRole('button', { name: /Clinic Staff Doctors, receptionists and administrators/i });

      expect(patientBtn).toBeDefined();
      expect(staffBtn).toBeDefined();
      expect(patientBtn.className).toContain('min-h-[88px]');
      expect(staffBtn.className).toContain('min-h-[88px]');
    });

    it('focuses and labels the last used audience without skipping the chooser', async () => {
      localStorage.setItem('cms_auth_audience', 'staff');
      const { Wrapper } = createMockAuth();

      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      // Chooser remains displayed
      expect(screen.getByText('Who is signing in?')).toBeDefined();

      // Last used label appears under Clinic Staff
      expect(screen.getByText('Last used')).toBeDefined();

      // Clinic Staff option receives focus
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      const staffBtn = screen.getByRole('button', { name: /Clinic Staff/i });
      expect(document.activeElement).toBe(staffBtn);
    });

    it('skips the chooser directly to the form when ?as=patient or ?as=staff is in the URL', async () => {
      window.history.replaceState({}, '', '/?as=patient');
      const { Wrapper } = createMockAuth();

      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      // Directly renders patient sign-in form without showing chooser
      expect(screen.queryByText('Who is signing in?')).toBeNull();
      expect(screen.getByText('Signing in as Patient')).toBeDefined();
      expect(screen.getByRole('button', { name: /Sign In to Patient Portal/i })).toBeDefined();
    });

    it('pushes history entry on option selection and returns to chooser on Back button', async () => {
      const { Wrapper } = createMockAuth();

      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      const patientBtn = screen.getByRole('button', { name: /Patient/i });
      await act(async () => {
        fireEvent.click(patientBtn);
      });

      // Transitions to form step
      expect(screen.getByText('Signing in as Patient')).toBeDefined();
      expect(window.location.search).toContain('as=patient');

      // Simulate browser Back button (popstate to root)
      await act(async () => {
        window.history.replaceState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Returns to chooser
      expect(screen.getByText('Who is signing in?')).toBeDefined();
    });

    it('returns to chooser and restores focus when clicking Change button', async () => {
      window.history.replaceState({}, '', '/?as=staff');
      const { Wrapper } = createMockAuth();

      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      expect(screen.getByText('Signing in as Clinic Staff')).toBeDefined();
      const changeBtn = screen.getByRole('button', { name: 'Change' });

      await act(async () => {
        fireEvent.click(changeBtn);
      });

      // Chooser is visible and parameter is cleared
      expect(screen.getByText('Who is signing in?')).toBeDefined();
      expect(window.location.search).not.toContain('as=staff');

      // Focus returns to the chosen option
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      const staffBtn = screen.getByRole('button', { name: /Clinic Staff/i });
      expect(document.activeElement).toBe(staffBtn);
    });
  });

  describe('Form State Preservation and Password Clearing on Audience Change', () => {
    it('preserves typed sign-in identifier and clears password when changing audience', async () => {
      window.history.replaceState({}, '', '/?as=staff');
      const { Wrapper } = createMockAuth();

      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      const usernameInput = screen.getByLabelText(/Username or Email/i) as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText(/Enter role password/i) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(usernameInput, { target: { value: 'custom_identifier_123' } });
        fireEvent.change(passwordInput, { target: { value: 'Secret@Pass1' } });
      });

      expect(usernameInput.value).toBe('custom_identifier_123');
      expect(passwordInput.value).toBe('Secret@Pass1');

      // Click Change to return to chooser
      const changeBtn = screen.getByRole('button', { name: 'Change' });
      await act(async () => {
        fireEvent.click(changeBtn);
      });

      // Select Patient option
      const patientBtn = screen.getByRole('button', { name: /Patient/i });
      await act(async () => {
        fireEvent.click(patientBtn);
      });

      // Identifier is preserved; password is cleared
      const usernameInputAfter = screen.getByLabelText(/Username or Email/i) as HTMLInputElement;
      const passwordInputAfter = screen.getByPlaceholderText(/Enter role password/i) as HTMLInputElement;

      expect(usernameInputAfter.value).toBe('custom_identifier_123');
      expect(passwordInputAfter.value).toBe('');
    });

    it('preserves typed name, email, and phone while clearing passwords in sign-up mode', async () => {
      window.history.replaceState({}, '', '/?as=staff');
      const { Wrapper } = createMockAuth();

      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      // Switch to sign-up view
      const createAccountBtn = screen.getByRole('button', { name: /Create account/i });
      await act(async () => {
        fireEvent.click(createAccountBtn);
      });

      expect(screen.getByText('Creating a Clinic Staff account')).toBeDefined();

      // Type common fields on Staff sign-up
      const nameInput = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
      const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText(/Min 10 chars/i) as HTMLInputElement;
      const confirmPasswordInput = screen.getByPlaceholderText(/Re-enter password/i) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Dr. Clara Oswald' } });
        fireEvent.change(emailInput, { target: { value: 'c.oswald@beaconclinic.com' } });
        fireEvent.change(phoneInput, { target: { value: '+1 (555) 789-0123' } });
        fireEvent.change(passwordInput, { target: { value: 'SecurePass@123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePass@123' } });
      });

      // Click Change to return to chooser
      const changeBtn = screen.getByRole('button', { name: 'Change' });
      await act(async () => {
        fireEvent.click(changeBtn);
      });

      // Select Patient option
      const patientBtn = screen.getByRole('button', { name: /Patient/i });
      await act(async () => {
        fireEvent.click(patientBtn);
      });

      expect(screen.getByText('Creating a Patient account')).toBeDefined();

      // Verify name, email, phone are retained; passwords are wiped
      const nameAfter = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
      const emailAfter = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
      const phoneAfter = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
      const passwordAfter = screen.getByPlaceholderText(/Min 10 chars/i) as HTMLInputElement;
      const confirmPasswordAfter = screen.getByPlaceholderText(/Re-enter password/i) as HTMLInputElement;

      expect(nameAfter.value).toBe('Dr. Clara Oswald');
      expect(emailAfter.value).toBe('c.oswald@beaconclinic.com');
      expect(phoneAfter.value).toBe('+1 (555) 789-0123');
      expect(passwordAfter.value).toBe('');
      expect(confirmPasswordAfter.value).toBe('');
    });
  });

  describe('Sign-Up Audience Forms and Absence of "I am a" Select', () => {
    it('verifies "I am a" select does not exist on sign-up screens', async () => {
      const { Wrapper } = createMockAuth();
      await act(async () => {
        render(
          <Wrapper>
            <SignUpView onBackToLogin={() => {}} audience="patient" />
          </Wrapper>
        );
      });

      expect(screen.queryByText('I am a')).toBeNull();
      expect(screen.queryByLabelText(/I am a/i)).toBeNull();
    });

    it('renders patient-specific fields and calls signUpPatient on submission', async () => {
      const { Wrapper, signUpPatientMock, signUpStaffMock } = createMockAuth();
      await act(async () => {
        render(
          <Wrapper>
            <SignUpView onBackToLogin={() => {}} audience="patient" />
          </Wrapper>
        );
      });

      expect(screen.getByText(/Date of Birth/i)).toBeDefined();
      expect(screen.getByText(/Biological Sex/i)).toBeDefined();
      expect(screen.queryByLabelText(/Job Title/i)).toBeNull();
      expect(screen.queryByLabelText(/Department/i)).toBeNull();
      expect(screen.queryByText(/Role requested/i)).toBeNull();

      await act(async () => {
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Eleanor Vance' } });
        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'e.vance@example.com' } });
        fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '+1 (555) 111-2233' } });
        fireEvent.change(screen.getByPlaceholderText(/Min 10 chars/i), { target: { value: 'ValidPass@123' } });
        fireEvent.change(screen.getByPlaceholderText(/Re-enter password/i), { target: { value: 'ValidPass@123' } });
      });

      const submitBtn = screen.getByRole('button', { name: /Register Patient Account/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(signUpPatientMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Eleanor Vance',
          email: 'e.vance@example.com',
          phone: '+1 (555) 111-2233',
          password: 'ValidPass@123',
        })
      );
      expect(signUpStaffMock).not.toHaveBeenCalled();
    });

    it('renders staff-specific fields and calls signUpStaff on submission', async () => {
      const { Wrapper, signUpPatientMock, signUpStaffMock } = createMockAuth();
      await act(async () => {
        render(
          <Wrapper>
            <SignUpView onBackToLogin={() => {}} audience="staff" />
          </Wrapper>
        );
      });

      expect(screen.getByLabelText(/Job Title/i)).toBeDefined();
      expect(screen.getByLabelText(/Department/i)).toBeDefined();
      expect(screen.getByText(/Role requested/i)).toBeDefined();
      expect(screen.queryByText(/Date of Birth/i)).toBeNull();
      expect(screen.queryByText(/Biological Sex/i)).toBeNull();

      await act(async () => {
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Dr. Sarah Connor' } });
        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 's.connor@beaconclinic.com' } });
        fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '+1 (555) 333-4455' } });
        fireEvent.change(screen.getByLabelText(/Job Title/i), { target: { value: 'Consulting Physician' } });
        fireEvent.change(screen.getByLabelText(/Department/i), { target: { value: 'General Medicine' } });
        fireEvent.change(screen.getByPlaceholderText(/Min 10 chars/i), { target: { value: 'StaffSecure@123' } });
        fireEvent.change(screen.getByPlaceholderText(/Re-enter password/i), { target: { value: 'StaffSecure@123' } });
      });

      const submitBtn = screen.getByRole('button', { name: /Submit Access Application/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(signUpStaffMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Dr. Sarah Connor',
          email: 's.connor@beaconclinic.com',
          phone: '+1 (555) 333-4455',
          jobTitle: 'Consulting Physician',
          department: 'General Medicine',
          password: 'StaffSecure@123',
        })
      );
      expect(signUpPatientMock).not.toHaveBeenCalled();
    });
  });

  describe('wrongPortal Action and Switch Button', () => {
    it('displays wrongPortal notice with switch button and switches to expected audience on click', async () => {
      window.history.replaceState({}, '', '/?as=staff');
      const wrongPortalMock = vi.fn().mockResolvedValue({
        code: 'wrongPortal',
        success: false,
        expectedAudience: 'patient',
        error: 'This is a patient account. Use the Patient option.',
      });

      const { Wrapper } = createMockAuth({ login: wrongPortalMock });
      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      // Submit on Staff form
      const submitBtn = screen.getByRole('button', { name: /Sign In to Medical Station/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Error message is displayed with switch button
      expect(screen.getByText('This is a patient account. Use the Patient option.')).toBeDefined();
      const switchBtn = screen.getByRole('button', { name: /Switch to Patient/i });
      expect(switchBtn).toBeDefined();

      // Click switch button
      await act(async () => {
        fireEvent.click(switchBtn);
      });

      // Audience is switched to Patient
      expect(screen.getByText('Signing in as Patient')).toBeDefined();
      expect(screen.getByRole('button', { name: /Sign In to Patient Portal/i })).toBeDefined();
    });
  });

  describe('Credentials Directory Filtering and Demo Mode Behavior', () => {
    it('filters credentials directory to open audience', async () => {
      const onFillMock = vi.fn();

      // 1. Staff audience
      const { rerender } = render(
        <DevCredentialsDirectory
          roleCredentials={ROLE_CREDENTIALS}
          onFill={onFillMock}
          currentAudience="staff"
        />
      );

      expect(screen.getByText(/Clinic Staff Accounts/i)).toBeDefined();
      expect(screen.getByText('Dr. Marcus Vance')).toBeDefined();
      expect(screen.getByText('Dr. Nathan Hayes')).toBeDefined();
      expect(screen.getByText('Priya Sharma')).toBeDefined();
      expect(screen.queryByText('Eleanor Wright')).toBeNull();

      // 2. Patient audience
      rerender(
        <DevCredentialsDirectory
          roleCredentials={ROLE_CREDENTIALS}
          onFill={onFillMock}
          currentAudience="patient"
        />
      );

      expect(screen.getByText(/Patient Accounts/i)).toBeDefined();
      expect(screen.getByText('Eleanor Wright')).toBeDefined();
      expect(screen.queryByText('Dr. Marcus Vance')).toBeNull();
      expect(screen.queryByText('Dr. Nathan Hayes')).toBeNull();
    });
  });
});
