import { createContext, useContext } from 'react'
import type { AllowedUser } from './db/users'

export interface AppUser extends AllowedUser {
  uid: string
  displayName: string
  photoURL: string
}

export const AppUserContext = createContext<AppUser | null>(null)

export function useAppUser() {
  return useContext(AppUserContext)!
}
