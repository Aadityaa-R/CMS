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

describe('Login and Sign-Up Audience Selector (M9.7)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  describe('Tab Behavior and Accessibility', () => {
    it('renders both audiences with correct ARIA attributes and defaults to Clinic Staff on first visit', async () => {
      const { Wrapper } = createMockAuth();
      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      // Verify tablist and tab roles
      const tablist = screen.getByRole('tablist', { name: /Portal audience/i });
      expect(tablist).toBeDefined();

      const patientTab = screen.getByRole('tab', { name: /Patient/i });
      const staffTab = screen.getByRole('tab', { name: /Clinic Staff/i });

      expect(patientTab).toBeDefined();
      expect(staffTab).toBeDefined();

      // First visit defaults to Clinic Staff
      expect(staffTab.getAttribute('aria-selected')).toBe('true');
      expect(patientTab.getAttribute('aria-selected')).toBe('false');
      expect(staffTab.getAttribute('aria-controls')).toBe('panel-audience');
      expect(patientTab.getAttribute('aria-controls')).toBe('panel-audience');

      // Submit button text reflects Clinic Staff audience
      expect(screen.getByRole('button', { name: /Sign In to Medical Station/i })).toBeDefined();
    });

    it('supports arrow-key navigation between Patient and Clinic Staff tabs', async () => {
      const { Wrapper } = createMockAuth();
      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      const tablist = screen.getByRole('tablist', { name: /Portal audience/i });
      const patientTab = screen.getByRole('tab', { name: /Patient/i });
      const staffTab = screen.getByRole('tab', { name: /Clinic Staff/i });

      // Starts on staff tab
      expect(staffTab.getAttribute('aria-selected')).toBe('true');

      // Press ArrowLeft on tablist to switch to Patient tab
      await act(async () => {
        fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
      });
      expect(patientTab.getAttribute('aria-selected')).toBe('true');
      expect(staffTab.getAttribute('aria-selected')).toBe('false');
      expect(screen.getByRole('button', { name: /Sign In to Patient Portal/i })).toBeDefined();

      // Press ArrowRight to cycle back to Clinic Staff tab
      await act(async () => {
        fireEvent.keyDown(tablist, { key: 'ArrowRight' });
      });
      expect(staffTab.getAttribute('aria-selected')).toBe('true');
      expect(patientTab.getAttribute('aria-selected')).toBe('false');
      expect(screen.getByRole('button', { name: /Sign In to Medical Station/i })).toBeDefined();
    });

    it('respects remembered tab from localStorage on visit', async () => {
      localStorage.setItem('cms_auth_audience', 'patient');
      const { Wrapper } = createMockAuth();
      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      const patientTab = screen.getByRole('tab', { name: /Patient/i });
      expect(patientTab.getAttribute('aria-selected')).toBe('true');
      expect(screen.getByRole('button', { name: /Sign In to Patient Portal/i })).toBeDefined();
    });

    it('overrides localStorage when ?as=staff or ?as=patient query parameter is present', async () => {
      localStorage.setItem('cms_auth_audience', 'staff');
      window.history.replaceState({}, '', '/?as=patient');

      const { Wrapper } = createMockAuth();
      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      const patientTab = screen.getByRole('tab', { name: /Patient/i });
      expect(patientTab.getAttribute('aria-selected')).toBe('true');
      expect(screen.getByRole('button', { name: /Sign In to Patient Portal/i })).toBeDefined();
    });
  });

  describe('Form State Preservation and Password Clearing on Tab Switch', () => {
    it('preserves typed sign-in identifier and clears password when switching tabs', async () => {
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

      // Type a custom identifier and password on Staff tab
      await act(async () => {
        fireEvent.change(usernameInput, { target: { value: 'custom_identifier_123' } });
        fireEvent.change(passwordInput, { target: { value: 'Secret@Pass1' } });
      });

      expect(usernameInput.value).toBe('custom_identifier_123');
      expect(passwordInput.value).toBe('Secret@Pass1');

      // Click Patient tab
      const patientTab = screen.getByRole('tab', { name: /Patient/i });
      await act(async () => {
        fireEvent.click(patientTab);
      });

      // Identifier is preserved; password is cleared
      const usernameInputAfter = screen.getByLabelText(/Username or Email/i) as HTMLInputElement;
      const passwordInputAfter = screen.getByPlaceholderText(/Enter role password/i) as HTMLInputElement;

      expect(usernameInputAfter.value).toBe('custom_identifier_123');
      expect(passwordInputAfter.value).toBe('');
    });

    it('preserves typed name, email, and phone while clearing passwords in sign-up mode', async () => {
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

      // Switch to Patient tab
      const patientTab = screen.getByRole('tab', { name: /Patient/i });
      await act(async () => {
        fireEvent.click(patientTab);
      });

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

  describe('Sign-Up Audience Forms and Removal of "I am a" Select', () => {
    it('verifies "I am a" select does not exist on sign-up screens', async () => {
      const { Wrapper } = createMockAuth();
      await act(async () => {
        render(
          <Wrapper>
            <SignUpView onBackToLogin={() => {}} audience="patient" />
          </Wrapper>
        );
      });

      // "I am a" label or select must NOT exist
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

      // Patient specific controls: Date of Birth and Biological Sex
      expect(screen.getByText(/Date of Birth/i)).toBeDefined();
      expect(screen.getByText(/Biological Sex/i)).toBeDefined();

      // Staff controls must not be rendered
      expect(screen.queryByLabelText(/Job Title/i)).toBeNull();
      expect(screen.queryByLabelText(/Department/i)).toBeNull();
      expect(screen.queryByText(/Role requested/i)).toBeNull();

      // Fill and submit patient form
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

      // Staff specific controls: Job Title, Department, Role requested
      expect(screen.getByLabelText(/Job Title/i)).toBeDefined();
      expect(screen.getByLabelText(/Department/i)).toBeDefined();
      expect(screen.getByText(/Role requested/i)).toBeDefined();

      // Patient controls must not be rendered
      expect(screen.queryByText(/Date of Birth/i)).toBeNull();
      expect(screen.queryByText(/Biological Sex/i)).toBeNull();

      // Fill and submit staff form
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
    it('displays wrongPortal notice with switch button and smoothly switches tabs on click', async () => {
      const wrongPortalMock = vi.fn().mockResolvedValue({
        code: 'wrongPortal',
        success: false,
        expectedAudience: 'patient',
        error: 'This is a patient account. Use the Patient tab.',
      });

      const { Wrapper } = createMockAuth({ login: wrongPortalMock });
      await act(async () => {
        render(
          <Wrapper>
            <LoginView />
          </Wrapper>
        );
      });

      // On Staff tab, submit
      const submitBtn = screen.getByRole('button', { name: /Sign In to Medical Station/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Error message is displayed with switch button
      expect(screen.getByText('This is a patient account. Use the Patient tab.')).toBeDefined();
      const switchBtn = screen.getByRole('button', { name: /Switch to Patient/i });
      expect(switchBtn).toBeDefined();

      // Click switch button
      await act(async () => {
        fireEvent.click(switchBtn);
      });

      // Audience is switched to Patient
      const patientTab = screen.getByRole('tab', { name: /Patient/i });
      expect(patientTab.getAttribute('aria-selected')).toBe('true');
      expect(screen.getByRole('button', { name: /Sign In to Patient Portal/i })).toBeDefined();
    });
  });

  describe('Credentials Directory Filtering and Hints', () => {
    it('filters credentials directory to open tab and renders plain text hints', async () => {
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
      expect(screen.getByText(/Full clinic governance/i)).toBeDefined();

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
      expect(screen.getByText(/Health portal, upcoming visits/i)).toBeDefined();
    });
  });
});

