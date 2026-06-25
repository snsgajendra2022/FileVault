import { render } from '@testing-library/react';
import App from './App';

jest.mock('./state/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    isAdmin: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    requestLoginOtp: jest.fn(),
    verifyLoginOtp: jest.fn(),
  }),
}));

test('renders whatsapp route shell', () => {
  window.history.pushState({}, '', '/whatsapp');
  const { container } = render(<App />);
  expect(container).toBeTruthy();
});
