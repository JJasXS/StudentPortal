import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AccountSwitcherModal } from '@/components/profile/AccountSwitcherModal';
import {
  getSavedAccounts,
  saveCurrentAccount,
  type SavedAccount,
} from '@/utils/savedAccounts';
import { dashboardPathForRole, canSignIn } from '@/utils/learnerPortal';

interface AccountSwitcherContextValue {
  openSwitcher: () => void;
  closeSwitcher: () => void;
  switchToAccount: (account: SavedAccount) => void;
  savedAccounts: SavedAccount[];
  refreshAccounts: () => void;
}

const AccountSwitcherContext = createContext<AccountSwitcherContextValue | undefined>(undefined);

export function AccountSwitcherProvider({ children }: { children: ReactNode }) {
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => getSavedAccounts());

  const refreshAccounts = useCallback(() => {
    saveCurrentAccount();
    setAccounts(getSavedAccounts());
  }, []);

  const switchToAccount = useCallback(
    (account: SavedAccount) => {
      if (!canSignIn(account.user.role)) return;
      setSession(account.token, account.user);
      saveCurrentAccount();
      setOpen(false);
      navigate(dashboardPathForRole(account.user.role as 'Admin' | 'Teacher' | 'Student' | 'Parent'));
    },
    [navigate, setSession]
  );

  const value = useMemo(
    () => ({
      openSwitcher: () => {
        refreshAccounts();
        setOpen(true);
      },
      closeSwitcher: () => setOpen(false),
      switchToAccount,
      savedAccounts: accounts,
      refreshAccounts,
    }),
    [accounts, refreshAccounts, switchToAccount]
  );

  return (
    <AccountSwitcherContext.Provider value={value}>
      {children}
      <AccountSwitcherModal
        open={open}
        onClose={() => setOpen(false)}
        accounts={accounts}
        activeUserId={user?.id}
        onSwitch={switchToAccount}
        onAccountsChange={refreshAccounts}
      />
    </AccountSwitcherContext.Provider>
  );
}

export function useAccountSwitcher() {
  const ctx = useContext(AccountSwitcherContext);
  if (!ctx) {
    throw new Error('useAccountSwitcher must be used within AccountSwitcherProvider');
  }
  return ctx;
}
