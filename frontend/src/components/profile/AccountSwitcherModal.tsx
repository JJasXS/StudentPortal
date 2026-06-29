import { useEffect, useState } from 'react';
import { Plus, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAccountSwitcher } from '@/context/AccountSwitcherContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import {
  getSavedAccounts,
  removeSavedAccount,
  saveCurrentAccount,
  type SavedAccount,
} from '@/utils/savedAccounts';
import { accountAvatarStyle, accountInitials } from '@/utils/accountDisplay';

interface SavedAccountListProps {
  accounts: SavedAccount[];
  activeUserId?: string;
  onSwitch: (account: SavedAccount) => void;
  onRemove: (userId: string) => void;
  emptyMessage?: string;
}

export function SavedAccountList({
  accounts,
  activeUserId,
  onSwitch,
  onRemove,
  emptyMessage = 'No saved accounts yet. Sign in once — your account is saved for quick switching.',
}: SavedAccountListProps) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-slate-500">
        <UserCircle className="h-10 w-10 text-slate-300" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {accounts.map((account) => {
        const active = account.user.id === activeUserId;
        const initials = accountInitials(account.user.fullName);
        const avatarStyle = accountAvatarStyle(account.user.role);

        return (
          <li key={account.user.id}>
            <button
              type="button"
              onClick={() => !active && onSwitch(account)}
              disabled={active}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition',
                active ? 'bg-primary-50/80' : 'hover:bg-slate-50'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  avatarStyle
                )}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {account.user.fullName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {account.user.email} · {account.user.role}
                </p>
              </div>
              {active ? (
                <span className="shrink-0 text-xs font-medium text-primary-600">Active</span>
              ) : (
                <span className="shrink-0 text-xs font-medium text-primary-600">Switch</span>
              )}
            </button>
            {!active && (
              <div className="border-t border-slate-50 px-4 pb-2 text-right">
                <button
                  type="button"
                  onClick={() => onRemove(account.user.id)}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  Remove from this device
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface AccountSwitcherModalProps {
  open: boolean;
  onClose: () => void;
  accounts: SavedAccount[];
  activeUserId?: string;
  onSwitch: (account: SavedAccount) => void;
  onAccountsChange: () => void;
}

export function AccountSwitcherModal({
  open,
  onClose,
  accounts,
  activeUserId,
  onSwitch,
  onAccountsChange,
}: AccountSwitcherModalProps) {
  const navigate = useNavigate();

  const handleAddAccount = () => {
    saveCurrentAccount();
    onClose();
    navigate('/login?addAccount=1');
  };

  return (
    <Modal open={open} onClose={onClose} title="Switch account" className="max-w-sm">
      <p className="mb-4 text-sm text-slate-500">
        Pick a saved account — no password needed.
      </p>
      <SavedAccountList
        accounts={accounts}
        activeUserId={activeUserId}
        onSwitch={onSwitch}
        onRemove={(userId) => {
          removeSavedAccount(userId);
          onAccountsChange();
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="mt-4 w-full gap-2"
        onClick={handleAddAccount}
      >
        <Plus className="h-4 w-4" />
        Use another account
      </Button>
    </Modal>
  );
}

/** Full saved-account list on the profile page — tap to switch user */
export function AccountSwitcherPanel({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { switchToAccount, refreshAccounts } = useAccountSwitcher();
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => getSavedAccounts());

  useEffect(() => {
    saveCurrentAccount();
    setAccounts(getSavedAccounts());
  }, [user?.id]);

  const handleSwitch = (account: SavedAccount) => {
    switchToAccount(account);
    setAccounts(getSavedAccounts());
  };

  const handleRemove = (userId: string) => {
    removeSavedAccount(userId);
    refreshAccounts();
    setAccounts(getSavedAccounts());
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900">Saved accounts</p>
          <p className="text-xs text-slate-500">Tap another user to switch instantly — no OTP</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => {
            saveCurrentAccount();
            navigate('/login?addAccount=1');
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <SavedAccountList
        accounts={accounts}
        activeUserId={user?.id}
        onSwitch={handleSwitch}
        onRemove={handleRemove}
      />
    </div>
  );
}
