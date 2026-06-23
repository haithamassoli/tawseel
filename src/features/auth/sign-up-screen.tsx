import type { SignUpFormProps } from './components/sign-up-form';
import { useAuthActions } from '@convex-dev/auth/react';
import { useRouter } from 'expo-router';

import * as React from 'react';
import { FocusAwareStatusBar, showErrorMessage } from '@/components/ui';
import { translate } from '@/lib/i18n';
import { SignUpForm } from './components/sign-up-form';

export function SignUpScreen() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [loading, setLoading] = React.useState(false);

  const onSubmit: SignUpFormProps['onSubmit'] = async (data) => {
    setLoading(true);
    try {
      // Backend Password provider profile() must map params.phone -> account id
      // and persist params.name to the users doc (see blockers).
      await signIn('password', {
        phone: data.phone,
        password: data.password,
        name: data.name,
        flow: 'signUp',
      });
      router.replace('/');
    }
    catch {
      showErrorMessage(translate('auth.sign_up_error'));
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FocusAwareStatusBar />
      <SignUpForm onSubmit={onSubmit} loading={loading} />
    </>
  );
}
