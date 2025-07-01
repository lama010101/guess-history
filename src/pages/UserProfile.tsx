import { AccountSettings } from '@/components/AccountSettings';

const UserProfilePage = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-8 text-history-primary">Your Account</h1>
      <div className="glass-card rounded-xl p-6">
        <AccountSettings />
      </div>
    </div>
  );
};

export default UserProfilePage;
