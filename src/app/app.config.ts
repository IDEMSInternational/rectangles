import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { loadStorage } from '@studio/container/stored-setting';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The player's progress, from the app's storage, before anything reads it.
    provideAppInitializer(() => loadStorage()),
  ],
};
