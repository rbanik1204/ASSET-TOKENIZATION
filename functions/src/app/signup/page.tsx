import { redirect } from 'next/navigation';

export default function SignUpPage() {
  redirect('/');
}

/*

'use client';

import React from 'react';
import Link from 'next/link';

            <Button type="submit" variant="primary" fullWidth loading={submitting} disabled={submitting}>
              Create account
            </Button>

            <Button type="button" variant="outline" fullWidth onClick={onGoogle} disabled={submitting}>
              Continue with Google
            </Button>

            <div className="text-xs text-[color:var(--text-muted)]">
              Already have an account?{' '}
              <Link
                href={redirectParam ? `/signin?redirect=${encodeURIComponent(redirectParam)}` : '/signin'}
                className="underline hover:text-[color:var(--text)]"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}

*/
