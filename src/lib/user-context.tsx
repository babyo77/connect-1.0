"use client";

import localforage from "localforage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
} from "react";

export interface User {
  id: string;
  peerId: string;
  checking: boolean;
}

type UserAction = { type: "SET_USER"; payload: Partial<User> };

interface UserContextType {
  state: Partial<User> | null;
  dispatch: React.Dispatch<UserAction>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const userReducer: React.Reducer<Partial<User> | null, UserAction> = (
  state,
  action
) => {
  switch (action.type) {
    case "SET_USER":
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, {
    checking: true,
  });

  useEffect(() => {
    if (state) {
      localforage.setItem("user", state);
    }
  }, [state]);

  return (
    <UserContext.Provider value={{ state, dispatch }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
