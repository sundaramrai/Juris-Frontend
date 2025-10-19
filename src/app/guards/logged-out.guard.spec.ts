import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { LoggedOutGuard } from './logged-out.guard';
import "jasmine";

describe('LoggedOutGuard', () => {
  const executeGuard: CanActivateFn = () =>
    TestBed.runInInjectionContext(() => TestBed.inject(LoggedOutGuard).canActivate());

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
