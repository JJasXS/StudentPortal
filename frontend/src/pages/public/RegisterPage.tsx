import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Music className="mx-auto h-10 w-10 text-primary-600" />
          <CardTitle>Register</CardTitle>
          <CardDescription>Registration will be available in a future update.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-sm text-slate-600">
            Please contact your music school administrator to create an account.
          </p>
          <Link to="/login">
            <Button variant="outline">Back to Login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
