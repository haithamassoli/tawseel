import type { LoginFormProps } from './login-form';

import * as React from 'react';

import { translate } from '@/lib/i18n';
import { cleanup, screen, setup, waitFor } from '@/lib/test-utils';
import { LoginForm } from './login-form';

afterEach(cleanup);

const onSubmitMock: jest.Mock<LoginFormProps['onSubmit']> = jest.fn();

describe('loginForm Form ', () => {
  it('renders correctly', async () => {
    setup(<LoginForm />);
    expect(await screen.findByTestId('form-title')).toBeOnTheScreen();
  });

  it('should display required error when values are empty', async () => {
    const { user } = setup(<LoginForm />);

    const button = screen.getByTestId('login-button');
    expect(
      screen.queryByText(translate('auth.phone_required')),
    ).not.toBeOnTheScreen();
    await user.press(button);
    expect(
      await screen.findByText(translate('auth.phone_required')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(translate('auth.password_required')),
    ).toBeOnTheScreen();
  });

  it('should display matching error when phone is invalid', async () => {
    const { user } = setup(<LoginForm />);

    const button = screen.getByTestId('login-button');
    const phoneInput = screen.getByTestId('phone-input');
    const passwordInput = screen.getByTestId('password-input');

    await user.type(phoneInput, '12345');
    await user.type(passwordInput, 'password123');
    await user.press(button);

    expect(
      await screen.findByText(translate('auth.phone_invalid')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(translate('auth.phone_required')),
    ).not.toBeOnTheScreen();
  });

  it('should call LoginForm with correct values when values are valid', async () => {
    const { user } = setup(<LoginForm onSubmit={onSubmitMock} />);

    const button = screen.getByTestId('login-button');
    const phoneInput = screen.getByTestId('phone-input');
    const passwordInput = screen.getByTestId('password-input');

    await user.type(phoneInput, '0791234567');
    await user.type(passwordInput, 'password123');
    await user.press(button);
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledTimes(1);
    });
    // expect.objectContaining({}) because we don't want to test the target event we are receiving from the onSubmit function
    expect(onSubmitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '0791234567',
        password: 'password123',
      }),
    );
  });
});
