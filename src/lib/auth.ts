import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export type UserRole = 'admin' | 'leader' | 'staff';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  team_id: string | null;
  shift_id: string | null;
  phone: string | null;
  date_of_birth: string | null;
  annual_leave_balance: number;
  is_approved?: boolean;
  approval_date?: string | null;
  approval_rejected?: boolean;
  rejection_reason?: string | null;
}

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getCurrentSession = async (): Promise<Session | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getUserRole = async (userId: string): Promise<UserRole> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) return 'staff';
  return data.role as UserRole;
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email: string, password: string, metadata?: { first_name?: string; last_name?: string }) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: metadata
    }
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const checkUserApprovalStatus = async (userId: string): Promise<{ is_approved: boolean; approval_rejected: boolean; rejection_reason?: string }> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_approved, approval_rejected, rejection_reason')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { is_approved: false, approval_rejected: false };
  }

  return {
    is_approved: data.is_approved || false,
    approval_rejected: data.approval_rejected || false,
    rejection_reason: data.rejection_reason || undefined
  };
};

export const approveUser = async (userId: string): Promise<{ error?: any }> => {
  const { error } = await supabase
    .from('profiles')
    .update({
      is_approved: true,
      approval_date: new Date().toISOString(),
      approval_rejected: false,
      rejection_reason: null
    })
    .eq('id', userId);

  return { error };
};

export const rejectUser = async (userId: string, reason: string): Promise<{ error?: any }> => {
  const { error } = await supabase
    .from('profiles')
    .update({
      is_approved: false,
      approval_rejected: true,
      rejection_reason: reason,
      approval_date: new Date().toISOString()
    })
    .eq('id', userId);

  return { error };
};
