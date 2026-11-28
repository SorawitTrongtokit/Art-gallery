import type { Admin } from './lib/server/auth';

declare global {
  namespace App {
    interface Locals {
      admin?: Admin;
    }
  }
}

export {};
