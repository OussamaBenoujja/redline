import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // In a true V1 with JWTs, this would start null and conditionally render a <Login /> gateway.
  // For the testing pipeline, we initialize with the seeded user ID 3.
  const [user, setUser] = useState({
    id: 3,
    full_name: 'Fablean Demo Reader',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
  });

  const updateProfileContext = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, updateProfileContext }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
