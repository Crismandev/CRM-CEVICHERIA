import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'mesero';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const determineRole = async (currentUser: User): Promise<UserRole> => {
    if (currentUser.email === 'admin@elpuerto.com') return 'admin';
    
    // 1. Probar desde metadatos de usuario (sincronizado al crear/actualizar)
    if (currentUser.user_metadata?.rol === 'admin' || currentUser.user_metadata?.rol === 'mesero') {
      return currentUser.user_metadata.rol as UserRole;
    }
    
    // 2. Fallback: Consultar base de datos
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', currentUser.id)
        .single();
      if (!error && data?.rol) {
        return data.rol as UserRole;
      }
    } catch (err) {
      console.error('Error al obtener rol de base de datos:', err);
    }
    return 'mesero';
  };

  useEffect(() => {
    const handleAuthChange = async (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser) {
        const userRole = await determineRole(currentUser);
        setRole(userRole);
      } else {
        setRole(null);
      }
      setLoading(false);
    };

    // 1. Obtener la sesión actual de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session?.user ?? null);
    });

    // 2. Escuchar cambios de autenticación en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleAuthChange(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    role,
    loading,
    isAdmin: role === 'admin',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
