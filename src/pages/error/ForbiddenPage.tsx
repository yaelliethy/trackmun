import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import brand from '@/config/brand';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">403</p>
        <h1 className="text-2xl font-bold tracking-tight">Access denied</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          You do not have permission to view this page. If you believe this is a mistake, contact your
          conference organizer or sign in with a different account.
        </p>
      </div>
      <Button asChild variant="default">
        <Link to="/">{brand.appName} home</Link>
      </Button>
    </div>
  );
}
