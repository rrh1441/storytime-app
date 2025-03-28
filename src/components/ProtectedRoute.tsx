import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton'; // Or your preferred loading indicator

const ProtectedRoute: React.FC = () => {
  // Get the session status and loading state from the Auth context
  const { session, loading } = useAuth();

  // While the auth state is being determined, show a loading indicator
  if (loading) {
    // You can customize this loading state
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-10">
            <div className="w-full max-w-md space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
  }

  // If loading is finished and there's no active session, redirect to the login page
  if (!session) {
    // The 'replace' prop prevents the login route from being added to the history stack
    return <Navigate to="/login" replace />;
  }

  // If loading is finished and a session exists, render the nested child routes
  // <Outlet /> represents the component defined in the nested <Route> in App.tsx
  return <Outlet />;
};

export default ProtectedRoute;