import '@angular/compiler';

import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: () => ({
        matches: false,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
    }),
});

getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
);
