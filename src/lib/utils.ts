import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function make_connect_uuid(name: string) {
  return `${name}_${uuidv4()}`;
}
