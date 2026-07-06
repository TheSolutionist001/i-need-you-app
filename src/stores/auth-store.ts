import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/boot/supabase';
import type { Gender, Profile } from '@/types/profile';

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null);
  const user = ref<User | null>(null);
  const profile = ref<Profile | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(() => session.value !== null);

  async function fetchOwnProfile() {
    if (!user.value) {
      profile.value = null;
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single();
    if (error) {
      console.error('Profil konnte nicht geladen werden:', error.message);
      profile.value = null;
      return;
    }
    profile.value = data as Profile;
  }

  async function init() {
    const { data } = await supabase.auth.getSession();
    session.value = data.session;
    user.value = data.session?.user ?? null;
    if (user.value) {
      await fetchOwnProfile();
    }

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession;
      user.value = newSession?.user ?? null;
      if (user.value) {
        void fetchOwnProfile();
      } else {
        profile.value = null;
      }
    });

    initialized.value = true;
  }

  async function signUp(params: {
    email: string;
    password: string;
    firstName: string;
    gender: Gender;
    city: string;
  }) {
    const emailRedirectTo = `${window.location.origin}${window.location.pathname}#/login`;
    const { error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        emailRedirectTo,
        data: {
          first_name: params.firstName,
          gender: params.gender,
          city: params.city,
        },
      },
    });
    if (error) throw error;
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    session.value = null;
    user.value = null;
    profile.value = null;
  }

  async function updateOwnProfile(updates: Partial<Pick<Profile, 'first_name' | 'gender' | 'city'>>) {
    if (!user.value) throw new Error('Nicht eingeloggt');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.value.id)
      .select()
      .single();
    if (error) throw error;
    profile.value = data as Profile;
  }

  return {
    session,
    user,
    profile,
    initialized,
    isAuthenticated,
    init,
    signUp,
    signIn,
    signOut,
    fetchOwnProfile,
    updateOwnProfile,
  };
});
